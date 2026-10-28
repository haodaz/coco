"""SAM 3 on Modal: find the pet in an image by a short phrase ("dog", "black cat") and return its masks.

The same job as Meta's hosted sam-3.1 (src/lib/meta.ts samMasks), run on our own GPU so long cutout jobs never hit
the API's rate limits. The weights are gated on Hugging Face (facebook/sam3); the token lives in the Modal secret
"huggingface" as HF_TOKEN.

    modal deploy modal/sam.py     # then POST {image: base64 jpeg, phrase: "dog"} to the printed URL

Each mask comes back as a PNG (white = the object) cropped to its box, with the box and score, in the pixels of
the image that was sent.
"""
import base64
import io

import modal

app = modal.App("cocoverse-sam")
weights = modal.Volume.from_name("cocoverse-sam-weights", create_if_missing=True)
image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install("torch==2.7.1", "torchvision==0.22.1", "transformers>=4.57", "accelerate", "pillow", "fastapi[standard]")
    .env({"HF_HOME": "/weights"})
)
MODEL = "facebook/sam3"


@app.cls(image=image, cpu=8.0, memory=16384, volumes={"/weights": weights}, secrets=[modal.Secret.from_name("huggingface")], scaledown_window=120, timeout=120)
class Sam:
    @modal.enter()
    def load(self):
        import torch
        from transformers import Sam3Model, Sam3Processor

        self.torch = torch
        self.processor = Sam3Processor.from_pretrained(MODEL)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = Sam3Model.from_pretrained(MODEL, torch_dtype=torch.bfloat16 if self.device == "cuda" else torch.float32).to(self.device).eval()
        weights.commit()  # keep the downloaded weights for the next cold start

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def masks(self, body: dict):
        return self.find.local(body)

    @modal.method()
    def find(self, body: dict):
        from PIL import Image

        img = Image.open(io.BytesIO(base64.b64decode(body["image"]))).convert("RGB")
        # one phrase ("dog") or several (the pet and what it wears and holds); each mask says which phrase found it
        phrases = body.get("phrases") or [body.get("phrase", "dog")]
        result = []
        threshold = float(body.get("threshold", 0.5))
        # look at the image once, then ask for each phrase against the same vision features (text prompts are cheap)
        image_inputs = self.processor(images=img, return_tensors="pt").to(self.device)
        with self.torch.inference_mode():
            vision = self.model.get_vision_features(pixel_values=image_inputs.pixel_values.to(self.model.dtype))
            for phrase in phrases:
                text = self.processor(text=phrase, return_tensors="pt").to(self.device)
                out = self.model(vision_embeds=vision, **text)
                found = self.processor.post_process_instance_segmentation(out, threshold=threshold, mask_threshold=0.5, target_sizes=image_inputs.get("original_sizes").tolist())[0]
                self._collect(phrase, found, result)
        return {"width": img.width, "height": img.height, "masks": result}

    def _collect(self, phrase: str, found: dict, result: list):
        from PIL import Image

        for mask, box, score in zip(found["masks"], found["boxes"], found["scores"]):
            x0, y0, x1, y1 = [int(round(v)) for v in box.tolist()]
            x0, y0 = max(0, x0), max(0, y0)
            crop = mask[y0 : y1 + 1, x0 : x1 + 1].to("cpu").numpy().astype("uint8") * 255
            buf = io.BytesIO()
            Image.fromarray(crop, mode="L").save(buf, format="PNG")
            result.append({"phrase": phrase, "left": x0, "top": y0, "width": crop.shape[1], "height": crop.shape[0], "score": float(score), "png": base64.b64encode(buf.getvalue()).decode()})


@app.local_entrypoint()
def test(path: str, phrase: str = "dog,bow,collar"):
    """modal run modal/sam.py --path some.jpg : find the phrase in a local image and save the masks next to it."""
    from pathlib import Path

    import time

    p = Path(path)
    sam = Sam()
    for run in range(2):  # the first call includes the cold start; the second is the steady speed
        t0 = time.time()
        r = sam.find.remote({"image": base64.b64encode(p.read_bytes()).decode(), "phrases": phrase.split(",")})
        print(f"call {run + 1}: {time.time() - t0:.1f}s")
    print(f"{len(r['masks'])} mask(s) in {r['width']}x{r['height']}:", [(m["phrase"], m["left"], m["top"], m["width"], m["height"], round(m["score"], 2)) for m in r["masks"]])
    for i, m in enumerate(r["masks"]):
        (p.parent / f"{p.stem}-mask{i}.png").write_bytes(base64.b64decode(m["png"]))
