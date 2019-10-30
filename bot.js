var Twit = require('twit');
var fs  = require('fs');
const https = require('https');
const URL = require('url').Url;


var T = new Twit({
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token: process.env.access_token,
  access_token_secret: process.env.access_token_secret,
})


function loader () {
  new Promise((resolve,reject)=>{
      https.get('https://collectionapi.metmuseum.org/public/collection/v1/objects',resp=>{
        let data = '';

        resp.on('data', (chunk) => {
          data += chunk;
        });

        resp.on('end', () => {
          var json_data = JSON.parse(data);
          var total = json_data.total
          var random_objectID = Math.floor(Math.random()*total)
          var url = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/' + random_objectID
          resolve(url);
        });
      });
    }).then(url=>{
      new Promise((resolve,reject)=>{
        https.get(url,resp=>{
          let data = '';

          resp.on('data', (chunk) => {
            data += chunk;
          });

          resp.on('end', () => {
            var json_data = JSON.parse(data);
            var imageURL = json_data.primaryImage
            var title = json_data.title
            var date = json_data.objectDate

              if ((imageURL !== undefined && title !== undefined) && (imageURL !== '') && (date !== '')) {
                var details = {
                  imageURL: imageURL,
                  title: title,
                  date: date
                }
                  console.log(details);
                  resolve(details);
              } else {
                loader()
              }
          });
        });
      }).then(details=>{
        var fullUrl = details.imageURL;
        var file = fs.createWriteStream('./savedimage');
        var request = https.get(fullUrl, function(response) {
        response.pipe(file);
      });

      setTimeout(function(){
      var b64content = fs.readFileSync('./savedimage', { encoding: 'base64' })
      T.post('media/upload', { media_data: b64content }, function (err, data, response) {
        // now we can assign alt text to the media, for use by screen readers and
        // other text-based presentations and interpreters
        var mediaIdStr = data.media_id_string
        var altText = details.title
        var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }
        T.post('media/metadata/create', meta_params, function (err, data, response) {
          if (!err) {
            // now we can reference the media and post a tweet (media will attach to the tweet)
            var params = { status: details.title + ", " + details.date, media_ids: [mediaIdStr] }

            T.post('statuses/update', params, function (err, data, response) {
              console.log('It worked')
            })
          } else {
            console.log(err);
          }
        })
       })
      }, 2000);
    });
  });
 }


// setInterval(loader, 240*60*1000);
// loader();
setInterval(loader, 1000*60*30);
