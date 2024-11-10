import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import VideoJS from "./VideoJS";
import { API_BASE_URL } from "../Constants";

function Training(props) {
  const [loading, setLoading] = useState(true);
  const [trainingInfo, setTrainingInfo] = useState({});
  const [videoJsOptions, setVideoJsOptions] = useState({});

  const search = useLocation().search;
  const urlParams = new URLSearchParams(search);

  const playerRef = useRef(null);
  const needTrainingUpdateStatusAPICall = useRef(true);

  const handlePlayerReady = (player) => {
    playerRef.current = player;

    player.on("timeupdate", () => {
      console.log(needTrainingUpdateStatusAPICall.current);

      if (needTrainingUpdateStatusAPICall.current) {
        console.log("timeupdate");
        console.log(player.currentTime() / player.duration());
        // 例えば動画を80%見たら完了にしたい場合は0.8に変更する
        if (player.currentTime() / player.duration() > 0.99) {
          // update completed
          needTrainingUpdateStatusAPICall.current = false;
          updateCompleteStatus();
        }
      }
    });
  };

  async function updateCompleteStatus() {
    console.log("updateCompleteStatus");

    try {
      const url = API_BASE_URL + "/training/status";
      const body = {
        trainingId: trainingInfo.TrainingId,
      };
      const req = {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      };

      console.log(req);

      const res = await fetch(url, req);
      if (res.ok) {
        setTrainingInfo((state) => {
          return {
            ...state,
            IsCompleted: true,
            status: "完了済み",
          };
        });
        console.log("Status update successful");
      } else {
        console.error("Status update failed");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function getTrainingInfo(trainingId) {
    try {
      const params = {
        trainingId: trainingId,
      };
      const query = new URLSearchParams(params);
      const url = API_BASE_URL + "/training?" + query;
      const req = {
        method: "GET",
      };

      const res = await fetch(url, req);
      const resJson = await res.json();
      /*
       * resJson = {
       *   "trainingInfo": }
       *     "Title": "<training title>",
       *     "Description": "<training description>",
       *     "TrainingId": 0,
       *     "VideoKey": "<training video s3 key",
       *     "IsCompleted": true,
       *   }
       * }
       */
      console.log(resJson);
      if ("trainingInfo" in resJson) {
        const trainingInfo = resJson.trainingInfo;
        trainingInfo.status = "未完了";
        if (trainingInfo.IsCompleted) {
          trainingInfo.status = "完了済み";
        }
        console.log("setTrainingInfo");

        needTrainingUpdateStatusAPICall.current = !trainingInfo.IsCompleted;
        return trainingInfo;
      } else {
        throw new Error();
      }
    } catch (e) {
      console.error(e);
      alert("APIエラー");
    }
  }

  useEffect(() => {
    document.title = trainingInfo.Title;
  }, []);

  async function init() {
    const trainingId = urlParams.get("trainingId");
    console.log(trainingId);

    const trainingInfo = await getTrainingInfo(trainingId);
    console.log(trainingInfo);
    setTrainingInfo(trainingInfo);

    setVideoJsOptions({
      controls: true,
      resopnsive: true,
      fluid: true,
      sources: [
        {
          src: trainingInfo.VideoKey,
          type: "application/x-mpegURL",
        },
      ],
    });

    setLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container-lg mb-5 mt-5">
      <div className="row mx-3">
        <h4>
          <div
            className={
              trainingInfo.IsCompleted
                ? "badge bg-success"
                : "badge bg-secondary"
            }
          >
            {trainingInfo.status}
          </div>
        </h4>
      </div>

      <div className="row mx-3">
        <h2>{trainingInfo.Title}</h2>
      </div>

      <div className="row mx-3 mt-3">
        <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />
      </div>

      <div className="row mx-3 mt-3 mb-5">
        <div className="col-2 fs-5">概要: </div>
        <div className="col-10 fs-5">{trainingInfo.Description}</div>
      </div>
    </div>
  );
}

export default Training;
