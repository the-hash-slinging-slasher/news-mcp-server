---
description: Generate a daily news briefing with audio from configured news sources
---

Generate a comprehensive news briefing from the newsfeed MCP server.

## User Input Required

First, ask the user how far back they want to look for news. Examples:
- "last 8 hours"
- "last 24 hours"
- "since Friday"
- "since last week"
- "last 48 hours"

Parse their response and convert it to hours for the newsfeed query.

## Steps to Execute

1. **Fetch News**: Query the newsfeed MCP for top news using `mcp__newsfeed__get_feed`:
   - source: "all"
   - hours_ago: [parsed from user input]
   - limit: 30

2. **Read Articles in Parallel**: For each news item returned, use WebFetch to read the full article content. Run these WebFetch calls in parallel for maximum efficiency.

3. **Generate Sources Index**: Create a markdown file with all news sources, organized by category (Security, AI & Technology, Developer Tools, Infrastructure, etc.). Include:
   - One-line summary of each story
   - Link to the original source
   - Category organization

4. **Write Conversational Transcript**: Create a conversational, TTS-optimized transcript that:
   - Uses natural speech patterns ("Let's talk about...", "Now here's something interesting...")
   - Emphasizes the most important/interesting stories
   - Includes source attributions naturally ("That's from Bleeping Computer", "Check out their blog for more")
   - Spells out technical terms phonetically (e.g., "ASP dot NET", "hash REF errors")
   - Uses contractions and casual language
   - Avoids symbols that TTS engines read poorly (like "━━━" or "CVE-2025-XXXXX")
   - Groups related stories together
   - Ends with a friendly sign-off

5. **Generate Audio**: Convert the transcript to MP3 using gTTS:
   ```bash
   gtts-cli -f [transcript-file] -o [audio-file]
   ```

6. **Organize Files**: Create directory structure and save all files:
   - Directory: `./news-briefings/YYYY/MM/DD/`
   - Files (with timestamp):
     - `sources-YYYYMMDD-HHMMSS.md` (markdown index)
     - `transcript-YYYYMMDD-HHMMSS.txt` (conversational transcript)
     - `audio-YYYYMMDD-HHMMSS.mp3` (generated audio)

7. **Provide Playback Instructions**: Tell the user:
   - Where the files were saved
   - How to play the audio (e.g., `afplay [path]` or `open [path]`)
   - The total number of stories covered

## Important Notes

- Run WebFetch calls **in parallel** to maximize performance
- Some sites may block WebFetch - handle gracefully and continue with available content
- The transcript should sound natural when read by a TTS engine
- Use today's date for the directory structure
- Include the timestamp in filenames for uniqueness
- Keep the sources index well-organized for easy reference

## Example Conversational Style

Good: "Alright, let's talk security. CISA just ordered federal agencies to patch a critical WSUS vulnerability by November 14th. And here's the scary part - attackers are already exploiting it in the wild. That's from Bleeping Computer."

Bad: "CRITICAL SECURITY ALERTS. CVE-2025-59287 WSUS vulnerability. CISA orders patch. [Source: https://www.bleepingcomputer.com/...]"
