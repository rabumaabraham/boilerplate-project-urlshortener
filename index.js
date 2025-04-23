require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const BodyParser = require('body-parser');
const DNS = require('dns');

// configuring body-parser for POST methods
app.use(BodyParser.urlencoded({ extended: false }));

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// array of objects to map links with an ID
const URLs = [];

// ID variable to be mapped with
let id = 0;

// POST request to create the shortened URL
app.post('/api/shorturl', (req, res) => {
  const { url: _url } = req.body;

  if (!_url) {
    return res.json({
      error: 'invalid url',
    });
  }

  // Try to create a valid URL object (this will validate the format)
  let parsed_url;
  try {
    parsed_url = new URL(_url);
  } catch (err) {
    return res.json({
      error: 'invalid url',
    });
  }

  // DNS lookup for domain validation
  DNS.lookup(parsed_url.hostname, (err) => {
    if (err) {
      return res.json({
        error: 'invalid url',
      });
    } else {
      // Check if the URL already exists in the array
      const link_exists = URLs.find((l) => l.original_url === _url);

      if (link_exists) {
        return res.json({
          original_url: _url,
          short_url: link_exists.short_url,
        });
      } else {
        // Increment for each new valid URL
        ++id;

        // Object creation for entry into the URL array
        const url_object = {
          original_url: _url,
          short_url: id.toString(),
        };

        // Push the new entry into the array
        URLs.push(url_object);

        // Return the new entry created
        return res.json({
          original_url: _url,
          short_url: id,
        });
      }
    }
  });
});

// GET request to navigate to the original URL
app.get('/api/shorturl/:id', (req, res) => {
  const { id: _id } = req.params;

  // Find if the ID already exists
  const short_link = URLs.find((sl) => sl.short_url === _id);

  if (short_link) {
    return res.redirect(short_link.original_url);
  } else {
    return res.json({
      error: 'invalid URL',
    });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
