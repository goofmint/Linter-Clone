var ext = require('./extract-content-all'),
    ex = new ext.ExtractContentJS.LayeredExtractor(),
    request = require('request'),
    jsdom = require('jsdom'),
    app = require('express').createServer(),
    mongoose = require('mongoose'),
    Iconv  = require('iconv').Iconv,
    uri    = require('url'),
    Buffer = require('buffer').Buffer;

// url = 'http://www.aichan.biz/html/html/h.html';
// url = 'http://d.hatena.ne.jp/hokaccha/20110801/1312216630'

var Schema   = mongoose.Schema;
var UrlSchema = new Schema({
    title: String,
    content: String,
    images: [String],
    html: String,
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
    url: String,
    urls: [String]
});
mongoose.model('Url', UrlSchema);
mongoose.connect(process.env.MONGOHQ_URL || 'mongodb://localhost/mongo_data');

app.enable('jsonp callback');
app.get('/', function(req, res){
    url = req.query.url ? req.query.url.replace(/^\//, "") : "";
    if (!url.match(/^http.?:\/\/.*/)) {
        return res.json({message: "Not found"+url, status: 404});
    }
    
    Url = mongoose.model('Url');
    Url.find({url: url}, function (err, docs) {
        if (typeof docs[0] != "undefined") {
            if (req.query.refresh == "true") {
                Url.remove({url: url}, function(err) {
                    console.log(err);
                });
            }else{
                doc = docs[0];
                return res.json({title: doc.title, url:doc.url, content:doc.content, images: doc.images, videos: doc.videos});
            }
        }
        request(url, function (error, response, body) {
            if (error || response.statusCode != 200) {
                return res.json({message: error, status: response.statusCode});
            }
            var document = jsdom.jsdom(body);
            document.location = {};
            url = response.request.uri.href;
            document.location.href = url;
            ex.addHandler(ex.factory.getHandler('Heuristics'));
            var result = ex.extract(document, url);
            var new_url = new Url({title: result.title, url: url, content:result.content.toString()});
            new_url.urls.push(url);
            var images = result.content.main_image(jsdom);
            var videos = result.content.videos(jsdom);
            for (var i = 0; i <= images.length; i++){
                if (typeof images[i] != "undefined") {
                    if (images[i].match(/^http.*?/)) {
                        image_url = images[i]
                    }else if (images[i].match(/^\/.*/)) {
                        url_params = uri.parse(url);
                        url_params["pathname"] = images[i];
                        image_url = uri.format(url_params);
                    }else{
                        image_url = uri.format(uri.parse(url + images[i]));
                    }
                    console.log(image_url);
                    new_url.images.push(image_url);
                }
            }
            new_url.videos = videos;
            new_url.save(function(err){
                if (err) { console.log(err); }
            });
            doc = new_url;
            res.json({title: doc.title, url:doc.url, content:doc.content, images: doc.images, videos: doc.videos});
        });
    });
});
var port = process.env.PORT || 9000;
app.listen(port);
