'use strict';
var pg = require('pg'),
  async = require('async'),
  https = require('https'),
  URL = require('url'),
  b64Stream = require('base64-stream'),
  Client = require('pg').Client;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-requested-with',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
}

const getAddresses = function(client, slug,cb) {
  client.query("select k.gnaf_pid, k.street_locality_pid, k.address, k.locality_name, k.postcode, CONCAT(k.street_name,' ',k.street_type) AS street, CASE WHEN k.flat_number IS NULL THEN CASE WHEN k.number_last IS NULL THEN k.number_first ELSE CONCAT(k.number_first,'-',k.number_last) END ELSE CONCAT(k.flat_number,'/',CASE WHEN k.number_last IS NULL THEN k.number_first ELSE CONCAT(k.number_first,'-',k.number_last) END) END AS street_number, CASE WHEN k.flat_number IS NOT NULL AND k.flat_number LIKE '[0-9]+' THEN regexp_replace(k.flat_number, '[^0-9]+', '', 'g')::integer ELSE NULL END as subpremise_sort, k.number_first as premise_sort from gnaf_201702.addresses k where k.mb_2011_code = $1 AND(primary_secondary IS NULL OR primary_secondary = 'S') AND alias_principal = 'P' order by 2,9,8", [slug], (err, res) => {
    if (err) return cb(err);
    var data = res.rows;
    cb(err,data);
  });

}

const getImage = function(client, slug,cb) {
  client.query("SELECT googleencodeline(st_exteriorring(ST_GeometryN(k.geom,1))) from admin_bdys_201702.abs_2011_mb as k WHERE k.mb_11code = $1", [slug], (err, res) => {
    if (err) return cb(err);

    var sURL = 'https://maps.googleapis.com/maps/api/staticmap?size=950x200&scale=2&path=fillcolor:0x00000060%7Ccolor:0xFFFFFF00%7Cenc:' + res.rows[0].googleencodeline + '&key=' + process.env.GOOGLE_MAPS_KEY,
    oURL = URL.parse(sURL);

    const req = https.request(oURL, (res) => {
      var type = res.headers["content-type"],
      prefix = "data:" + type + ";base64,",
      body = "";

      res.setEncoding('binary');
      res.on('end', () => {
        var base64 = new Buffer(body, 'binary').toString('base64'),
        data = prefix + base64;
        cb(null, data);
      });
      res.on('data', (chunk) => {
          if (res.statusCode == 200) body += chunk;
      });
      res.on('error', (err) => {
        cb(err);
      });
    });

    req.on('error', (err) => {
      cb(err);
    });
    req.end();
  });

}

module.exports.getForBounds = (event, context, callback) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL  })
  client.connect();

  client.query("SELECT row_to_json(fc) FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features FROM (SELECT 'Feature' As type, ST_AsGeoJSON(k.geom,7)::json As geometry, row_to_json((SELECT l FROM (SELECT mb_11code As slug,yes_quarantined As quarantined) As l)) As properties from admin_bdys_201702.abs_2011_mb as k WHERE ST_Intersects(ST_MakeEnvelope($1,$2,$3,$4,4283),k.geom) AND k.mb_category = 'RESIDENTIAL') As f ) As fc", [event.queryStringParameters.nwx,event.queryStringParameters.nwy,event.queryStringParameters.sex,event.queryStringParameters.sey], (err, res) => {
    client.end()
    if (err) return callback(err)

    const response = {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(res.rows[0].row_to_json)
    };
    callback(null, response);
  });
};

module.exports.generateMap = (event, context, callback) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL  })
  client.connect();

  async.parallel({
    image: cb => getImage(client, event.queryStringParameters.slug, cb),
    addresses: cb => getAddresses(client, event.queryStringParameters.slug, cb)
  }, function(err, results) {
    client.end()
    if (err) return callback(err)

    var pdf = require('./build-pdf').create(results.image,results.addresses,event.queryStringParameters.slug),
    stream = pdf.pipe(b64Stream.encode()),
    // Uncomment to preview the pdf locally
    //  stream = pdf.pipe(require('fs').createWriteStream('output.pdf')),
    data = '';
    pdf.end();

    stream.on('data', function(chunk) {
      data += chunk;
    });

    stream.on('end', function() {
      const response = {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({base64: data})
      };
      callback(null,response);
    });
  });

};
