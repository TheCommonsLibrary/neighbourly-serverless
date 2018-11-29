'use strict';

var Printer = require('pdfmake'),
    _ = require('lodash'),
    path = require('path');

function fontPath(file) {
    return path.resolve('roboto', file);
}

module.exports = {
    create: function(image,addresses,slug) {
        var table = [];

        _.forEach(_.groupBy(addresses,'street'), function(value, key) {
            table.push([
                {text: key, style:'streetLocalityHR1'},
                {text: 'Unable to knock', style:['streetLocalityHR1','streetLocalityHR2']},
                {text: 'Not Home', style:['streetLocalityHR1','streetLocalityHR2']},
                {text: 'Not Interested', style:['streetLocalityHR1','streetLocalityHR2']},
                {text: 'Meaningful Conversation', style:['streetLocalityHR1','streetLocalityHR2']},
            ]);
            _.forEach(value, function(adr) {
                table.push([
                    [{text: adr.street_number, bold: true, fontSize: 10},{text: adr.gnaf_pid, fontSize: 6}],
                    {canvas:[{type: 'rect',x: 20,y: 2.5,w: 10,h: 10,r: 3,lineWidth: 1,lineColor: '#000000'}]},
                    {canvas:[{type: 'rect',x: 20,y: 2.5,w: 10,h: 10,r: 3,lineWidth: 1,lineColor: '#000000'}]},
                    {canvas:[{type: 'rect',x: 20,y: 2.5,w: 10,h: 10,r: 3,lineWidth: 1,lineColor: '#000000'}]},
                    {canvas:[{type: 'rect',x: 20,y: 2.5,w: 10,h: 10,r: 3,lineWidth: 1,lineColor: '#000000'}]}
            ])
        })
    });

        var docDefinition = {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            /*
            background: function(currentPage) {
                console.log(currentPage);
                var image = '';
                if (currentPage > 2) { image = 'baselayer.png' }
                return { image: image }
            },
            */
            // [left, top, right, bottom] or [horizontal, vertical] or just a number for equal margins
            pageMargins: [ 30, 75, 30, 30 ],
            watermark: {text: slug, color: '#000000', opacity: 0.1, bold: true, italics: false},
            content: [
                {
                    image: image,
                    fit: [595, 250]
                },
              {
                style: 'table',
                table: {
                  headerRows: 0,
                  dontBreakRows: true,
                  widths: [ '20%', '*', '*', '*', '*'],
                  body: table
                }
              }
            ],
            styles: {
                streetLocalityHR1: {
                    fontSize: 10,
                    bold: true,
                    // color: '#fff',
                    // fillColor: '#555',
                    alignment: 'center'
                },
                streetLocalityHR2: {
                    fontSize: 7
                },
                pageHeader: {
                    alignment: 'left',
                    fontSize: 22,
                    margin: [0, 5, 0, 15]
                },
                table: {
                    margin: [0, 0, 0, 0]
                }
            },
            defaultStyle: {
                alignment: 'center',
                fontSize: 11
            }
          };

          var fontDescriptors = {
            Roboto: {
              normal: fontPath('RobotoCondensed-Regular.ttf'),
              bold: fontPath('RobotoCondensed-Bold.ttf'),
              italics: fontPath('RobotoCondensed-Italic.ttf'),
              bolditalics: fontPath('RobotoCondensed-Italic.ttf')
            }
          };
          var printer = new Printer(fontDescriptors);

          var pdfDoc = printer.createPdfKitDocument(docDefinition);

          return pdfDoc;

    }
};
