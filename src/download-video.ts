import fs from "fs/promises";
import path from "path";
import { runCommand } from "./run-command";

export type VideoFilepaths = {
  mp3Filepath: string;
  thumbnailFilepath: string;
  metadataFilepath: string;
  folderPath: string;
};

export async function downloadVideo(url: string): Promise<VideoFilepaths> {
  // Create random, filename safe job id
  const jobId = Math.random().toString(36).substring(2);

  await fs.mkdir(jobId);

  await runCommand(
    `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" --extract-audio --audio-format mp3 --write-thumbnail --write-info-json -o '${jobId}/${jobId}.%(ext)s' '${url}'`
  );

  const files = await fs.readdir(`./${jobId}`);

  const imageFile = files.find((file) =>
    [".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
      file.endsWith(extension)
    )
  );

  return {
    mp3Filepath: path.resolve(`./${jobId}/${jobId}.mp3`),
    thumbnailFilepath: path.resolve(`./${jobId}/${imageFile}`),
    metadataFilepath: path.resolve(`./${jobId}/${jobId}.info.json`),
    folderPath: path.resolve(`./${jobId}`),
  };
}
