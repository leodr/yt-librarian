<h1 align="center"><a href="https://npmjs.com/package/yt-librarian" target="_blank">yt-librarian</a></h1>

<p align="center">
    <strong> Download YouTube songs with automatic mp3 metadata and cover photos. </strong>
</p>

<br><br>

You need an OPENAI_API_KEY environment variable, as that is used to parse and
organize the metadata. You also need yt-dlp and ffmpeg installed.

If you have that, all you have to do is `npx yt-librarian "&lt;url&gt;" and
everything should work. You will get a correctly tagged mp3 file in your cwd.

<br>

## Development

1. **Requirements**

   You need [Node.js](https://nodejs.org/en/) installed on your system.

2. **Install packages**

   Run `npm install` to install all neccesary packages.

3. **Run the application**

   Run the script locally with `npm start "<url>"`
