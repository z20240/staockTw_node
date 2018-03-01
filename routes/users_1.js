var express = require('express');
var router = express.Router();
var request = require('request');

/* GET users listing. */
router.get('/', function (req, res, next) {
    getStockMethod();
});

/**
 * @description POST Method to get stocks
 * @param {*} body
 */
router.post('/', function(req, res, next) {
    let tse_sock_ids = JSON.parse(req.body.tse);
    let otc_sock_ids = JSON.parse(req.body.otc);
    let stock_ids = {
        tse: tse_sock_ids,
        otc: otc_sock_ids,
    }
    getStockMethod(stock_ids).then(result => {

    });
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
    if (!stock_ids) {
        stock_ids = {
            tsc: ['1101', '0050'],
        };
    }

    /* Get ActiveSheet */
    let host = "http://mis.twse.com.tw";
    let stockInfoUrl;
    let query_str = "";
    Object.keys(stock_ids).forEach(ele => { // tsc, otc
        stock_ids[ele].forEach((stock_id, idx) => { // [1101, 1102]
            console.log(stock_id);
            query_str += (ele + "_" + stock_id + ".tw");
            if (idx != stock_ids[ele].length-1)
                query_str += "|";
        });
    });
    var timestamp = Math.floor(Date.now()/1000) + 1800;
    stockInfoUrl = host + "/stock/api/getStockInfo.jsp?json=1&delay=0&_=" + timestamp + "&ex_ch=" + query_str;

    /* The TAIEX API is not stable so I need failover */
    let max_retry = 10
    let ua = "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0";

    let cookieJar = request.jar();

    /* Poke TWSE homepage to get session id, e.g.JSESSIONID=5B050F7AF3A3CD64091F772D7D589A82; Path=/stock */
    let options = {
        "medthod": "get",
        "headers": {
            "User-Agent": ua
        },
        "validateHttpsCertificates": false,
        "followRedirects": false,
        jar : cookieJar,
    };

    // return new Promise((resolve, reject) => {
        request.get(host, options, function(err, response, body) {
            if (err) {
                // reject({"result" : "get session error", "mes" : err});
            }

            let server_cookie = response.headers['set-cookie']; // 'image/png'
            let cookie = server_cookie[0].split(";")[0];
            // console.log(cookie);

            let headers = {
                "Cookie": cookie,
                "User-Agent": ua
            }
            let options = {
                "method": "get",
                "escaping": true,
                "headers": headers
            };

            // var stockInfoUrl = host + "/stock/api/getStockInfo.jsp?json=1&delay=0&_=" + timestamp + "&ex_ch=tse_1101.tw";
            console.log(stockInfoUrl);
            request.get(stockInfoUrl, options, function(err, res, bod) {
                if (err) {
                    // reject({"result" : "get stock error", "mes" : err});
                }
                console.log("[second test]", res);
                // console.log("[body]", JSON.parse(bod));
                // resolve(bod);
            })
        });
    // });
    return;


    // var respForSession = UrlFetchApp.fetch("http://" + host + "/stock/index.jsp?lang=zh-tw", options);
    // Logger.log(respForSession.getHeaders());

    // var server_cookie = respForSession.getHeaders()["Set-Cookie"];
    // var cookie = server_cookie.substring(0, server_cookie.indexOf(";"));
    // var headers = {
    //     "Cookie": cookie,
    //     "User-Agent": ua
    // }
    // var options = {
    //     "method": "get",
    //     "escaping": true,
    //     "headers": headers
    // };
    // /* Row0 can be used for title of table, so we start read stock from Row1 */
    // var timestamp = Date.now() + 1800;
    // // stockInfoUrl - http://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_1102.tw&json=1&delay=0&_=1505059448088
    // var stockInfoUrl = "http://" + host + "/stock/api/getStockInfo.jsp?json=1&delay=0&_=" + timestamp + "&ex_ch="
    // for (var i = 1; i < aryData.length; i++) {
    //     if (aryData[i][0]) {
    //         if (i > 1) {
    //             //stockInfoUrl += "%7C"
    //             stockInfoUrl += "|"
    //         }
    //         stockInfoUrl += "tse_" + aryData[i][0] + ".tw"
    //     }
    // }
    // for (var retry = 0; retry < max_retry; retry++) {
    //     var stocks = getStock(stockInfoUrl, options);
    //     var updateTime = Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm");
    //     if (stocks == null || stocks.length == 0) {
    //         sheet.getRange("H1").setValue("Fail to sync " + updateTime + " CST");
    //         continue;
    //     } else {
    //         for (var i = 0; i < stocks.length; i++) {
    //             var stock = stocks[i]
    //             /* getRange() starts from 1 */
    //             sheet.getRange(i + 2, 2).setValue(stock.name);
    //             sheet.getRange(i + 2, 3).setValue(stock.curPrice);
    //             sheet.getRange(i + 2, 4).setValue(stock.volume);
    //             sheet.getRange(i + 2, 5).setValue(stock.high);
    //             sheet.getRange(i + 2, 6).setValue(stock.low);
    //         }
    //         sheet.getRange("H1").setValue("Last Update " + updateTime + " CST");
    //     }
    //     return;
    // }
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