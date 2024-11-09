/*
- $ npm init
- $ npm install express
- $ npm install cors
- $ npm install -g nodemon
- $ npm start
  - or 
    - $ node main.js
*/

const express = require("express");
const cors = require("cors");
const app = express();
const port = 8080;
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

app.get("/training/list", async (req, res) => {
  console.log("[GET][/training/list] begin");
  // await sleep(5 * 1000);
  const body = {
    trainings: [
      {
        Title: "トレーニング1",
        Description: "トレーニング1の説明",
        TrainingId: 1,
      },
    ],
  };

  res.json(body);
  console.log("[GET][/training/list] end");
});

app.put("/training/status", async (req, res) => {
  console.log("[PUT][/training/status] begin");
  console.log(req);
  res.sendStatus(200);
  console.log("[PUT][/training/status] end");
});

app.get("/training", async (req, res) => {
  console.log("[GET][/training] begin");
  const trainingId = req.query.trainingId;
  console.log("[/training] trainingId: " + trainingId);
  const body = {
    trainingInfo: {
      Title: "トレーニング1",
      Description: "トレーニング1の説明",
      TrainingId: trainingId,
      VideoKey: "",
      IsCompleted: false,
    },
  };
  res.json(body);
  console.log("[GET][/training] end");
});

app.get("/video/presigned-url", async (req, res) => {
  console.log("[GET][/video/presigned-url] begin");
  const body = {
    presignedUrlInfo: {
      bucket: "S3Bucket",
      key: "S3Key",
      url: "http://localhost:" + port + "/tmp/upload-url",
    },
  };
  res.json(body);
  console.log("[GET][/video/presigned-url] end");
});

app.post("/tmp/upload-url", async (req, res) => {
  console.log("[POST][/tmp/upload-url] begin");
  console.log(req.body);
  res.sendStatus(200);
  console.log("[POST][/tmp/upload-url] end");
});

app.post("/training", async (req, res) => {
  console.log("[POST][/training] begin");
  console.log(req.body);
  res.sendStatus(200);
  console.log("[POST][/training] end");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
