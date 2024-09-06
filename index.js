const fs = require('fs');
const Handlebars = require('handlebars');
const parser = require('xml2json');
const he = require('he');

// Load the rssFeeds from the JSON file
const rssFeeds = require('./rssFeeds.json');

// Fetch and parse RSS feeds using fetch
async function fetchFeed(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const data = await response.text(); // fetch returns text, parse it into XML format
    const json = JSON.parse(parser.toJson(data)); // Convert XML to JSON
    return json.feed.entry.map(video => ({
      ...video,
      title: he.decode(video.title) // Decode HTML entities in the title
    })); // Return the list of video entries with decoded titles
  } catch (error) {
    console.error(`Error fetching feed from ${url}`, error);
    return [];
  }
}

// Load Handlebars template from file
function loadTemplate() {
  return new Promise((resolve, reject) => {
    fs.readFile('./index.hbs', 'utf-8', (err, templateContent) => {
      if (err) {
        return reject(err);
      }
      resolve(templateContent);
    });
  });
}

// Generate HTML page with videos using Handlebars
async function generateHTML() {
  let videos = [];

  // Fetch all feeds and accumulate videos
  for (const feed of rssFeeds) {
    const feedVideos = await fetchFeed(feed.url);
    videos = videos.concat(feedVideos.map(video => ({
      ...video,
      channelId: feed.channelId,
      channelTitle: feed.title
    })));
  }

  // Extract unique channels for the dropdown
  const uniqueChannels = rssFeeds.map(feed => ({
    channelId: feed.channelId,
    channelTitle: feed.title
  }));

  // Load the Handlebars template
  const templateSource = await loadTemplate();
  const template = Handlebars.compile(templateSource); // Compile the template

  // Pass video data and unique channels to the template
  const htmlContent = template({ videos, uniqueChannels });

  // Write the generated HTML to the index.html file
  fs.writeFileSync('./index.html', htmlContent);
  console.log('HTML generated successfully');
}

// Run the script
generateHTML();
