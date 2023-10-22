#!/usr/bin/env node

import "dotenv/config";
import fs from "fs";
import { Listr } from "listr2";
import path from "path";
import { VideoFilepaths, downloadVideo } from "./download-video";
import { Metadata, parseMetadata } from "./parse-tags";
import { runCommand } from "./run-command";

import { program } from "commander";

program
  .name("yt-librarian")
  .description(
    "Download YouTube songs with automatic mp3 metadata and cover photos."
  )
  .version("0.1.0");

type Ctx = {
  filepaths: VideoFilepaths;
  metadata: Metadata;
  jpgThumbnailFilepath: string;
};

program
  .command("download <url>", { isDefault: true })
  .description("Downloads the video at the specified YouTube video URL")
  .action(async (url) => {
    const tasks = new Listr<Ctx>([
      {
        title: "Download video and metadata",
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
          const { album, artists, contributors, genre, title, year } =
            ctx.metadata;
          const { mp3Filepath } = ctx.filepaths;
          const { jpgThumbnailFilepath } = ctx;
          // 2. Embed the square thumbnail and parsed metadata into the MP3 file
          const artistsString = artists.join(", ");

          const outputFilename = `${artists[0]} - ${title}.mp3`.replace(
            "/",
            "|"
          );

          const command = [
            `ffmpeg -i "${mp3Filepath}" -i "${jpgThumbnailFilepath}" -c copy -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (front)"`,
            `-y`,
            `-map 0 -map 1 -c copy -id3v2_version 3`,
            `-metadata title="${title}"`,
            `-metadata artist="${artistsString}"`,
            `-metadata album="${album}"`,
            year && `-metadata date="${year}"`,
            genre && `-metadata genre="${genre}"`,
            contributors && `-metadata comment="${contributors}"`,
            `"${outputFilename}"`,
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
  });

program.parseAsync(process.argv);
