import Foundation
import Vision
import AppKit

let path = "/var/folders/ff/1256dxsn4dldsp_5k0_2htkc0000gn/T/copilot-image-4b46f8.png"
let url = URL(fileURLWithPath: path)
guard let image = NSImage(contentsOf: url) else { fatalError("no image") }
var rect = CGRect(origin: .zero, size: image.size)
guard let cg = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else { fatalError("no cgimage") }
let width = CGFloat(cg.width)
let height = CGFloat(cg.height)
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([request])
for obs in request.results ?? [] {
  guard let cand = obs.topCandidates(1).first else { continue }
  let b = obs.boundingBox
  let x = Int(b.minX * width)
  let y = Int((1 - b.maxY) * height)
  let w = Int(b.width * width)
  let h = Int(b.height * height)
  print("\(x),\(y),\(w),\(h)\t\(cand.string)")
}
