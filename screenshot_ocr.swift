import Foundation
import Vision
import AppKit

let path = "/var/folders/ff/1256dxsn4dldsp_5k0_2htkc0000gn/T/copilot-image-4b46f8.png"
let url = URL(fileURLWithPath: path)
guard let image = NSImage(contentsOf: url) else { fatalError("no image") }
var rect = CGRect(origin: .zero, size: image.size)
guard let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else { fatalError("no cgimage") }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([request])
let results = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
for line in results { print(line) }
