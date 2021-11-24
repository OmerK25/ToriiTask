const rp = require("request-promise");
var Airtable = require("airtable");

// Creating a class for the TableLine.
// A TableLine is the line that will be posted to the Airtable database.
class TableLine {
  constructor(price, date) {
    this.price = price;
    this.date = date;
  }
}

// Creating a queue of TableLines.
// Every time the getPrice function is called,
// A new TableLine will be added to the queue.
const Lines = [];

// Making a GET request to the API endpoint.
// Using CoinBase API to get the latest price of Bitcoin,
// And then posting the price to the Airtable database.
const getPrice = () => {
  const requestOptions = {
    method: "GET",
    uri: " https://api.coinbase.com/v2/prices/spot?currency=USD",
    json: true,
    gzip: true,
  };

  rp(requestOptions)
    .then((response) => {
      const coinbasePrice = response.data.amount;
      Lines.unshift(new TableLine(coinbasePrice, new Date()));

      console.log("API call response:", coinbasePrice);
      postPriceToAirTable(Lines.pop());
    })
    .catch((err) => {
      console.log("API call error:", err.message);
    });
};

// Posting the price to the Airtable database
// Using the Airtable API to create a new record.
// The record will be created with the a time and price.
const postPriceToAirTable = (line) => {
  var base = new Airtable({ apiKey: "Put your key here" }).base(
    "appANQYjOXArE7B1l"
  );
  base("BTC Table").create(
    [
      {
        fields: {
          Time: line.date,
          Rates: Number(line.price),
        },
      },
    ],
    function (err, records) {
      if (err) {
        // error status 500/ 502/ 503, means something is wrong with the server.
        // if The AirTable is not available, this error will be displayed.
        // The Data needs to be stored somewhere, so that when the AirTable is available again,
        // it will be updated and not lost.
        //
        // For now, the data is stored in the Lines array.
        // Iv'e tried to create a queue, so if a TableLine (meaning date and price) can't be posted to the Airtable,
        // it will enter the queue, and when the AirTable is available again,
        // it will be posted to the Airtable by the correct order.
        console.error(err);
        return;
      }
      records.forEach(function (record) {
        console.log(record.getId());
      });
    }
  );
};

// cheking if the Queue is empty, if so, start the interval.
// if not, try and post the first element in the queue, until the queue is empty.
// Calling the The whole process of getting and posting the price.
// The process will be repeated every 1 minute.

if (Lines.length == 0) {
  setInterval(function () {
    var date = new Date();
    if (date.getSeconds() === 0) {
      getPrice();
    }
  }, 1000);
} else {
  postPriceToAirTable(Lines.pop());
}
