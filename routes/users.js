var express = require('express');
var router = express.Router();
var request = require('request');
var http = require('http');

/* GET users listing. */
router.get('/', function (req, res, next) {
    getStockMethod();
});


/**
    The example code is used to illustrate the method of updating stock price on Google Spreadsheet
    See the post for details - https://www.lightblue.asia/realtime-tw-stockprice-in-google-spreadsheet
**/

// stock class
function STOCK_() {
    this.ticker = "";
    this.name = "";
    this.curPrice = 0.0;
    this.high = 0.0;
    this.low = 0.0;
    this.volume = 0;
}

function getStockMethod(stock_ids) {
    /* Get ActiveSheet */
    var host = "http://mis.twse.com.tw";

    if (!stock_ids) {
        stock_ids = {
            tse: [
                '1101',
                '0050',
            ],
        };
    }

    let query_str = "";
    Object.keys(stock_ids).forEach(ele => { // tse, otc
        stock_ids[ele].forEach((stock_id, idx) => { // [1101, 1102]
            console.log(stock_id);
            query_str += (ele + "_" + stock_id + ".tw");
            if (idx != stock_ids[ele].length-1)
                query_str += "|";
        });
    });

    /* Row0 can be used for title of table, so we start read stock from Row1 */
    var timestamp = Date.now() + 1800;

    let stockInfoUrl = host + "/stock/api/getStockInfo.jsp?json=1&delay=0&_=" + timestamp + "&ex_ch=" + query_str;

    // http://mis.twse.com.tw/stock/api/getStockInfo.jsp?json=1&delay=0&ex_ch=tse_1101.tw|tse_0050.tw
    // http://mis.twse.com.tw/stock/api/getStockInfo.jsp?json=1&delay=0&_=1519713869431&ex_ch=tse_1101.tw|tse_0050.tw


    /* The TAIEX API is not stable so I need failover */
    var max_retry = 10
    var ua = "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0";

    var cookieJar = request.jar();

    /* Poke TWSE homepage to get session id, e.g.JSESSIONID=5B050F7AF3A3CD64091F772D7D589A82; Path=/stock */
    var options = {
        "medthod": "get",
        "headers": {
            "User-Agent": ua
        },
        "validateHttpsCertificates": false,
        "followRedirects": false,
        jar : cookieJar,
    };

    return new Promise((resolve, reject) => {

        request.get(host, options, function(err, response, body) {
            if (err) {
                reject({"result" : "get session error", "mes" : err});
            }

            var server_cookie = response.headers['set-cookie']; // 'image/png'
            var cookie = server_cookie[0].split(";")[0];
            // console.log(cookie);

            var headers = {
                "Cookie": cookie,
                "User-Agent": ua
            }
            var options = {
                "method": 'GET',
                "url": stockInfoUrl,
                // ==== 這邊的 qs.unescape 是自己去改 request.js 的架構實現的，若需要的話，請翻這支的 qs
                "qs" : {
                    "unescape": true,
                },
                "headers": headers
            };
            var timestamp = Date.now() + 1800;

            request.get(options, function(err, res, bod) {
                if (err) {
                    reject({"result" : "get stock error", "mes" : err});
                }
                // console.log("[second test]", res);
                console.log("[second test]", bod);
                // console.log(stockInfoUrl);
                console.log("[body]", JSON.parse(bod));
                resolve(bod);
            })
        });
    });



    return;


    var respForSession = UrlFetchApp.fetch("http://" + host + "/stock/index.jsp?lang=zh-tw", options);
    Logger.log(respForSession.getHeaders());

    var server_cookie = respForSession.getHeaders()["Set-Cookie"];
    var cookie = server_cookie.substring(0, server_cookie.indexOf(";"));
    var headers = {
        "Cookie": cookie,
        "User-Agent": ua
    }
    var options = {
        "method": "get",
        "escaping": true,
        "headers": headers
    };
}



function getStock(stockInfoUrl, options) {
    var stocks = [];
    // var sheet = SpreadsheetApp.getActiveSheet();

    //sheet.getRange("D11").setValue(stockInfoUrl);
    //sheet.getRange("D12").setValue(options);
    try {
        var response = UrlFetchApp.fetch(stockInfoUrl, options);
        Logger.log(response.getContentText());
        var jsonData = JSON.parse(response.getContentText());
        if (jsonData.rtmessage === undefined || jsonData.rtmessage !== "OK") {
            Logger.log("Fail to fetch response");
            return null;
        }
        for (var i = 0; i < jsonData.msgArray.length; i++) {
            var stock = new STOCK_()
            var respStock = jsonData.msgArray[i];

            stock.ticker = respStock.c;
            stock.curPrice = respStock.z;
            stock.name = respStock.n;
            stock.high = respStock.h;
            stock.low = respStock.l;
            stock.volume = respStock.v;
            stocks[i] = stock;
        }
        return stocks;
    } catch (error) {
        Logger.log(error)
        return null;
    }
}

module.exports = router;