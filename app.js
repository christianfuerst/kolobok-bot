const axios = require("axios");
const _ = require("lodash");
const faker = require("faker");
const { Api, JsonRpc, RpcError } = require("eosjs");
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

let timestamp = Math.round(new Date() / 1000);

let nftOne;
let nftTwo;

let nftArray = [];
let nftArrayCandidates = [];

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
    limit: 1000,
    reverse: false,
    show_payer: false,
  })
  .then((result) => {
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

    nftArrayCandidates = _.orderBy(
      nftArray,
      ["idata.gen", "mdata.cd"],
      ["desc", "asc"]
    );

    nftArrayCandidates = _.filter(nftArrayCandidates, {
      mdata: { health: 100 },
    });

    nftArrayCandidates = _.filter(nftArrayCandidates, function (o) {
      return o.mdata.cd < timestamp;
    });

    nftOne = nftArrayCandidates[0];
    nftTwo = nftArrayCandidates[1];

    if ((nftOne.mdata.cd < timestamp) & (nftTwo.mdata.cd < timestamp)) {
      console.log("We've got a match!");

      (async () => {
        const result = await api.transact(
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
        );
        console.dir(result);
      })();
    }
  });
