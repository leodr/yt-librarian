import OpenAI from "openai";

const openai = new OpenAI();

export type Metadata = {
  title: string;
  artist: string;
  album: string;
  year: number;
  genre: string;
  contributors: string;
};

function removeLinks(text: string) {
  // Matches various forms of URLs (with http, https, ftp, www, etc.)
  const urlRegex = /https?:\/\/[^\s]+|ftp:\/\/[^\s]+|www\.[^\s]+/g;

  return text.replace(urlRegex, "");
}

export async function parseMetadata(
  title: string,
  channelName: string,
  description: string
): Promise<Metadata> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are assisting the user adding metadata to MP3 files from a YouTube video download.`,
    },
    {
      role: "user",
      content: `# YouTube Video Information\n\n## Video Name\n${title}\n\n## Channel Name\n${channelName}\n\n## Video Description\n${removeLinks(
        description
      )}`,
    },
  ];

  const functions = [
    {
      name: "store_metadata",
      description: "Store metadata about song or mix.",
      parameters: {
        type: "object",
        properties: {
          title: {
            description:
              "The song or mix title, in the format 'Title (feat. Artist 2, Artist 3, ...)'. Do not list the main artist. If this is a remix, mention the DJ or producer in the title, and not the original artist.",
            type: "string",
          },
          artist: {
            description:
              "Name of the main artist. Should only ever be one artist, if multiple, use the first artist listed. If this is a remix of some sort, list the original artist. If this is a compilation or set, list the DJ.",
            type: "string",
          },
          album: {
            description:
              "Album the song belongs to. If not stated, use the song or mix title, but without listing the featured artists.",
            type: "string",
          },
          year: {
            description: "Release year or date where set is performed.",
            type: "integer",
            minimum: 1900,
          },
          genre: {
            description:
              "The music genre. If it cannot be determined, use 'Unknown'.",
            type: "string",
            enum: [
              "Alternative",
              "Ambient",
              "Blues",
              "Classical",
              "Country",
              "Dance",
              "Disco",
              "Electronic",
              "Folk",
              "Funk",
              "Goa",
              "Hard Rock",
              "Hip-Hop",
              "House",
              "Indie",
              "Jazz",
              "Metal",
              "Musical",
              "Opera",
              "Other",
              "Pop",
              "R&B",
              "Rap",
              "Reggae",
              "Rock & Roll",
              "Rock",
              "Soundtrack",
              "Techno",
              "Unknown",
              "Vocal",
            ],
          },
          contributors: {
            description:
              "Information about the producers or other contributors to the track, in the format 'Name (Role), Name (Role), ...'. Do not include the main artist or artists mentioned in the title.",
            type: "string",
          },
        },
        required: ["title", "artist", "album", "genre"],
      },
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    functions,
    function_call: { name: "store_metadata" },
    temperature: 0,
  });

  const metadataString = response.choices[0].message.function_call?.arguments;

  if (metadataString == null) {
    throw new Error("Could not parse metadata.");
  }

  const parsedMetadata = JSON.parse(metadataString) as Metadata;

  return parsedMetadata;
}
