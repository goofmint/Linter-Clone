var ext = require('./extract-content-all'),
    ex = new ext.ExtractContentJS.LayeredExtractor(),
    request = require('request'),
    jsdom = require('jsdom'),
    app = require('express').createServer(),
    mongoose = require('mongoose'),
    Iconv  = require('iconv-jp').Iconv,
    uri    = require('url'),
    Buffer = require('buffer').Buffer;

// 修正する

// url = 'http://www.aichan.biz/html/html/h.html';
// url = 'http://d.hatena.ne.jp/hokaccha/20110801/1312216630'
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
            var content = typeof result.content == "undefined" ? "" : result.content.toString();
            var new_url = new Url({title: result.title, url: url, content: content});
            new_url.urls.push(url);
            var images = typeof result.content == "undefined" ? [] : result.content.main_image(jsdom);
            var videos = typeof result.content == "undefined" ? [] : result.content.videos(jsdom);
            if (result.image) {
                new_url.images.push(result.image);
            }
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
var port = process.env.PORT || 3000;
app.listen(port);
