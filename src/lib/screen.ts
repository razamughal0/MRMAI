/**
 * MRM SCREEN CAPTURE — real screenshots via getDisplayMedia.
 * Stream reuse hota hai taake baar baar prompt na aaye.
 */

let stream: MediaStream | null = null;

export function visionSupported(): boolean {
  return !!navigator.mediaDevices?.getDisplayMedia;
}

export async function captureScreen(): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    if (!visionSupported()) return null;
    if (!stream || !stream.active) {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stream = null;
      });
    }
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((r) => setTimeout(r, 350));
    const w = video.videoWidth || 1920;
    const h = video.videoHeight || 1080;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(video, 0, 0, w, h);
    video.pause();
    video.srcObject = null;
    return { dataUrl: canvas.toDataURL("image/png"), width: w, height: h };
  } catch {
    return null;
  }
}

export function downloadShot(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function stopScreenShare(): void {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}