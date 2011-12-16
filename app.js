var ext = require('./extract-content-all'),
    ex = new ext.ExtractContentJS.LayeredExtractor(),
    request = require('request'),
    jsdom = require('jsdom'),
    Iconv  = require('iconv').Iconv,
    app = require('express').createServer(),
    Buffer = require('buffer').Buffer;

ex.addHandler(ex.factory.getHandler('Heuristics'));
url = 'http://www.aichan.biz/html/html/h.html';
// url = 'http://d.hatena.ne.jp/hokaccha/20110801/1312216630'

/*
        var iconv  = new Iconv("Shift-JIS", 'UTF-8//TRANSLIT//IGNORE');
        console.log((iconv.convert(res.title)).toString());
        console.log((iconv.convert(res.content.toString())).toString());
        console.log(res.content.main_image(jsdom));
*/

app.get('/*', function(req, res){
    if (req.url.match(/^\/http.?:\/\/.*/)) {
        url = req.url.replace(/^\//, "");
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var document = jsdom.jsdom(body);
                document.location = {};
                url = response.request.uri.href;
                document.location.href = url;
                var result = ex.extract(document, url);
                res.json({title: result.title, url:url, content:result.content.toString(), images: result.content.main_image(jsdom)});
            }else{
                return null;
            }
        });
    }else{
        res.writeHead(404, {'Content-Type':'application/json; charset=utf-8'});
        res.end('Not found');
    }
});
app.listen(3000);
