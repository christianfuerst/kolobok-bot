const axios = require("axios");
const _ = require("lodash");
const faker = require("faker");
const { Api, JsonRpc } = require("eosjs");
const { JsSignatureProvider } = require("eosjs/dist/eosjs-jssig");
const fetch = require("node-fetch");
const { TextEncoder, TextDecoder } = require("util");
const config = require("./config.json");

const defaultPrivateKey = config.privateKey;
const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);

const rpc = new JsonRpc("https://wax.greymass.com", { fetch });
const api = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder(),
});

function fetchNftArray() {
  return new Promise((resolve, reject) => {
    axios
      .post("https://wax.cryptolions.io/v1/chain/get_table_rows", {
        json: true,
        code: "simpleassets",
        scope: config.account,
        table: "sassets",
        table_key: "author",
        lower_bound: "ilovekolobok",
        upper_bound: "ilovekoloboka",
        index_position: 2,
        key_type: "i64",
        limit: 10000,
        reverse: false,
        show_payer: false,
      })
      .then((result) => {
        let nftArray = [];

        result.data.rows.forEach((element) => {
          let idata = JSON.parse(element.idata);
          let mdata = JSON.parse(element.mdata);

          nftArray.push({
            id: element.id,
            gen: idata.gen,
            genome: idata.genome,
            idata: idata,
            mdata: mdata,
          });
        });

        resolve(nftArray);

        console.log("fetchNftArray success.");
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function burnNft(nftArray) {
  let nftArrayCandidates = [];

  // Filtern auf 100 health
  nftArrayCandidates = _.filter(nftArray, {
    mdata: { health: -1 },
  });

  if (nftArrayCandidates.length > 0) {
    let idsArray = [];

    nftArrayCandidates.forEach((element) => {
      idsArray.push(element.id);
    });

    console.log("Found NFTs to burn! Broadcasting transaction...");

    api
      .transact(
        {
          actions: [
            {
              account: "simpleassets",
              name: "burn",
              authorization: [
                {
                  actor: config.account,
                  permission: "active",
                },
              ],
              data: {
                owner: config.account,
                assetids: idsArray,
                memo: faker.random.words(),
              },
            },
          ],
        },
        {
          blocksBehind: 3,
          expireSeconds: 30,
        }
      )
      .then((result) => {
        console.log(result);
      })
      .catch((error) => {
        console.error(error);
      });
  } else {
    console.log("No NFT to burn. Waiting for next iteration...");
  }
}

function matchPairs(nftArray) {
  let timestamp = Math.round(new Date() / 1000);

  let nftOne;
  let nftTwo;

  let nftArrayCandidates = [];

  // Nach gen absteigend sortieren
  nftArrayCandidates = _.orderBy(
    nftArray,
    ["idata.gen", "mdata.cd"],
    ["desc", "asc"]
  );

  // Filtern auf 100 health
  nftArrayCandidates = _.filter(nftArrayCandidates, {
    mdata: { health: 100 },
  });

  // Filtern auf alle ohne cd
  nftArrayCandidates = _.filter(nftArrayCandidates, function (o) {
    return o.mdata.cd < timestamp;
  });

  nftOne = nftArrayCandidates[0];
  nftTwo = nftArrayCandidates[1];

  if ((nftOne.mdata.cd < timestamp) & (nftTwo.mdata.cd < timestamp)) {
    console.log("We've got a match! Broadcasting transaction...");

    api
      .transact(
        {
          actions: [
            {
              account: "ilovekolobok",
              name: "breed",
              authorization: [
                {
                  actor: config.account,
                  permission: "active",
                },
              ],
              data: {
                owner: config.account,
                name: faker.name.findName(),
                parent1: nftOne.id,
                parent2: nftTwo.id,
              },
            },
          ],
        },
        {
          blocksBehind: 3,
          expireSeconds: 30,
        }
      )
      .then((result) => {
        console.log(result);
      })
      .catch((error) => {
        console.error(error);
      });
  } else {
    console.log("No match available. Waiting for next iteration...");
  }
}

function loop() {
  fetchNftArray().then((nftArray) => {
    matchPairs(nftArray);
    burnNft(nftArray);
  });
}

loop();
setInterval(loop, 60000);
