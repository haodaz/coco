// Finds human faces in an image with Apple's Vision framework, on this machine, before any photo
// is sent to a model. Prints JSON: [{"x":…,"y":…,"w":…,"h":…}] in 0–1 units, origin at the top left.
// Build: swiftc -O tools/faces.swift -o data/bin/faces
import Foundation
import Vision

guard CommandLine.arguments.count > 1 else {
    FileHandle.standardError.write("usage: faces <image>\n".data(using: .utf8)!)
    exit(2)
}
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let faces = VNDetectFaceRectanglesRequest()
faces.revision = VNDetectFaceRectanglesRequestRevision3
let handler = VNImageRequestHandler(url: url, options: [:])
do {
    try handler.perform([faces])
} catch {
    FileHandle.standardError.write("vision failed: \(error)\n".data(using: .utf8)!)
    exit(1)
}
let boxes = (faces.results ?? []).map { f -> [String: Double] in
    let b = f.boundingBox // Vision's origin is bottom left
    return ["x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height]
}
let json = try JSONSerialization.data(withJSONObject: boxes)
print(String(data: json, encoding: .utf8)!)
