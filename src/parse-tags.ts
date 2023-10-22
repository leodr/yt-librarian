import OpenAI from "openai";

const openai = new OpenAI();

export type Metadata = {
  title: string;
  artists: string[];
  album: string;
  year: number;
  genre: string;
  contributors: string;
};

export async function parseMetadata(
  title: string,
  channelName: string,
  description: string
): Promise<Metadata> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are assisting the user in downloading a YouTube video of a song or mix to an MP3 file with the correct metatags.",
    },
    {
      role: "user",
      content: `# YouTube Video Information\n\nTitle: ${title}\nChannel: ${channelName}\nDescription: ${description}`,
    },
  ];

  const functions = [
    {
      name: "parse_metadata",
      description:
        "Parse MP3 metadata from the YouTube video title and description.",
      parameters: {
        type: "object",
        properties: {
          title: {
            description:
              "The title of the track or mix, NOT the video title. Should not contain the artist name.",
            type: "string",
          },
          artists: {
            description:
              "List of artists who contributed to the track. If this is a mix, it should be the DJ's name.",
            type: "array",
            items: {
              type: "string",
            },
            minItems: 1,
          },
          album: {
            description:
              "The name of the album to which the track or mix belongs. If not noted, it should be the name of the track or mix.",
            type: "string",
          },
          year: {
            description: "The release year of the track.",
            type: "integer",
            minimum: 1900,
          },
          genre: {
            description: "The genre of the music.",
            type: "string",
          },
          contributors: {
            description:
              "Information about the producers or other contributors to the track, in the format 'Name (Role), Name (Role), ...'.",
            type: "string",
          },
        },
        required: ["title", "artists", "album"],
      },
    },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    functions,
    function_call: { name: "parse_metadata" },
    temperature: 0,
  });

  const metadataString = response.choices[0].message.function_call?.arguments;

  if (metadataString == null) {
    throw new Error("Could not parse metadata.");
  }

  const parsedMetadata = JSON.parse(metadataString) as Metadata;

  return parsedMetadata;
}
