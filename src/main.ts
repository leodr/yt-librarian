#!/usr/bin/env node

import "dotenv/config";
import fs from "fs";

import { program } from "commander";
import { downloadAndTagMp3 } from "./full-mp3-download";

program
  .name("yt-librarian")
  .description(
    "Download YouTube songs with automatic mp3 metadata and cover photos."
  )
  .version("0.1.0");

program
  .command("download <url>", { isDefault: true })
  .description("Downloads the video at the specified YouTube video URL")
  .action(async (url) => {
    await downloadAndTagMp3(url);
  });

program
  .command("multi-download <txt-file>")
  .description("Downloads all videos from links listed in a text file")
  .action(async (txtFile) => {
    // Split file into array of URLs by whitespace, comma or semicolon.
    const urlFile = await fs.promises.readFile(txtFile, "utf8");
    const urls = urlFile.split(/[\s,;]+/).map((url) => url.trim());

    await Promise.all(urls.map((url) => downloadAndTagMp3(url)));
  });

program.parseAsync(process.argv);
