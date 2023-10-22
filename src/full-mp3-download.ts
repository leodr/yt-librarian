import fs from "fs";
import { Listr } from "listr2";
import path from "path";
import { VideoFilepaths, downloadVideo } from "./download-video";
import { Metadata, parseMetadata } from "./parse-tags";
import { runCommand } from "./run-command";

type Ctx = {
  filepaths: VideoFilepaths;
  metadata: Metadata;
  jpgThumbnailFilepath: string;
};

export async function downloadAndTagMp3(url: string) {
  const tasks = new Listr<Ctx>([
    {
      title: "Download video as mp3",
      task: async (ctx) => {
        const paths = await downloadVideo(url);

        ctx.filepaths = paths;
      },
    },
    {
      title: "Parse metadata",
      task: async (ctx, task) => {
        const { metadataFilepath } = ctx.filepaths;

        const metadataContent = await fs.promises.readFile(
          metadataFilepath,
          "utf-8"
        );
        const metadata = JSON.parse(metadataContent);
        const videoTitle = metadata.title;
        const channelName = metadata.uploader;
        const videoDescription = metadata.description;

        const parsedMetadata = await parseMetadata(
          videoTitle,
          channelName,
          videoDescription
        );

        task.output = JSON.stringify(parsedMetadata, null, 2);

        ctx.metadata = parsedMetadata;
      },
      rendererOptions: { outputBar: Infinity, persistentOutput: true },
    },
    {
      title: "Prepare thumbnail",
      task: async (ctx) => {
        const { thumbnailFilepath } = ctx.filepaths;

        const jpgThumbnailFilepath = thumbnailFilepath.replace(
          path.extname(thumbnailFilepath),
          ".jpg"
        );

        if (thumbnailFilepath !== jpgThumbnailFilepath) {
          await runCommand(
            `ffmpeg -i "${thumbnailFilepath}" "${jpgThumbnailFilepath}"`
          );
        }

        if (path.extname(thumbnailFilepath) !== ".jpg") {
          await runCommand(
            `ffmpeg -y -i "${thumbnailFilepath}" "${jpgThumbnailFilepath}"`
          );
        }

        await runCommand(
          `ffmpeg -y -i "${jpgThumbnailFilepath}" -vf "crop=in_h:in_h" "${jpgThumbnailFilepath}"`
        );

        ctx.jpgThumbnailFilepath = jpgThumbnailFilepath;
      },
    },
    {
      title: "Add metatags to MP3",
      task: async (ctx) => {
        const { album, artist, contributors, genre, title, year } =
          ctx.metadata;
        const { mp3Filepath } = ctx.filepaths;
        const { jpgThumbnailFilepath } = ctx;

        const outputFilename = `${artist} - ${title}.mp3`
          .replaceAll("/", "|")
          .replaceAll('"', "'");

        const command = [
          `ffmpeg -i "${mp3Filepath}" -i "${jpgThumbnailFilepath}" -c copy -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)"`,
          `-y`,
          `-map 0 -map 1 -c copy -id3v2_version 3`,
          `-metadata title="${title.replaceAll('"', "'")}"`,
          `-metadata artist="${artist.replaceAll('"', "'")}"`,
          `-metadata album="${album.replaceAll('"', "'")}"`,
          year && `-metadata date="${year}"`,
          genre && `-metadata genre="${genre.replaceAll('"', "'")}"`,
          contributors &&
            `-metadata comment="${contributors.replaceAll('"', "'")}"`,
          `-metadata youtube_url="${url.replaceAll('"', "'")}"`,
          `"${outputFilename.replaceAll('"', "'")}"`,
        ]
          .filter(Boolean)
          .join(" ");

        await runCommand(command);
      },
    },
    {
      title: "Clean temporary files",
      task: async (ctx) => {
        await fs.promises.rm(`${ctx.filepaths.folderPath}`, {
          recursive: true,
          force: true,
        });
      },
    },
  ]);

  await tasks.run();
}
