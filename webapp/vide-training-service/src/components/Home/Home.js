import { useState, useEffect } from "react";
import { API_BASE_URL } from "../Constants";
import { TrainingCard } from "./TrainingCard";

function Home() {
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState(null);

  useEffect(() => {
    document.title = "動画研修サービス";
  }, []);

  async function init() {
    await getTrainingList();
    setLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  async function getTrainingList() {
    try {
      const url = API_BASE_URL + "/training/list";
      const req = {
        method: "GET",
      };

      const res = await fetch(url, req);
      const resJson = await res.json();
      /*
       * resJson = {
       *   "trainings": [
       *     {
       *       "Title": "<training title>",
       *       "Description": "<training description>",
       *       "TrainingId": 0,
       *     },
       *   ]
       * }
       */
      console.log(resJson);
      if ("trainings" in resJson) {
        setTrainings(resJson.trainings);
      } else {
        setTrainings([]);
      }
    } catch (e) {
      console.error(e);
      alert("APIエラー");
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container-lg mb-5 mt-5">
      <div className="row mx-3">
        <h2>研修一覧</h2>
      </div>

      <div className="row mx-3 mt-5" style={{ height: "300px" }}>
        {trainings.map((training) => {
          return <TrainingCard training={training} />;
        })}
      </div>
    </div>
  );
}

export default Home;
