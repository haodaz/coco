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
    .pip_install("torch==2.7.1", "transformers>=4.57", "accelerate", "pillow", "fastapi[standard]")
    .env({"HF_HOME": "/weights"})
)
MODEL = "facebook/sam3"


@app.cls(image=image, gpu="L4", volumes={"/weights": weights}, secrets=[modal.Secret.from_name("huggingface")], scaledown_window=120, timeout=120)
class Sam:
    @modal.enter()
    def load(self):
        import torch
        from transformers import Sam3Model, Sam3Processor

        self.torch = torch
        self.processor = Sam3Processor.from_pretrained(MODEL)
        self.model = Sam3Model.from_pretrained(MODEL, torch_dtype=torch.bfloat16).to("cuda").eval()
        weights.commit()  # keep the downloaded weights for the next cold start

    @modal.fastapi_endpoint(method="POST", requires_proxy_auth=True)
    def masks(self, body: dict):
        from PIL import Image

        img = Image.open(io.BytesIO(base64.b64decode(body["image"]))).convert("RGB")
        inputs = self.processor(images=img, text=body.get("phrase", "dog"), return_tensors="pt").to("cuda")
        with self.torch.inference_mode():
            out = self.model(**inputs)
        found = self.processor.post_process_instance_segmentation(
            out, threshold=float(body.get("threshold", 0.5)), mask_threshold=0.5, target_sizes=inputs.get("original_sizes").tolist()
        )[0]
        result = []
        for mask, box, score in zip(found["masks"], found["boxes"], found["scores"]):
            x0, y0, x1, y1 = [int(round(v)) for v in box.tolist()]
            x0, y0 = max(0, x0), max(0, y0)
            crop = mask[y0 : y1 + 1, x0 : x1 + 1].to("cpu").numpy().astype("uint8") * 255
            buf = io.BytesIO()
            Image.fromarray(crop, mode="L").save(buf, format="PNG")
            result.append({"left": x0, "top": y0, "width": crop.shape[1], "height": crop.shape[0], "score": float(score), "png": base64.b64encode(buf.getvalue()).decode()})
        return {"width": img.width, "height": img.height, "masks": result}
