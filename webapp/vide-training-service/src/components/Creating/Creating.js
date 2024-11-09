import { useState, useEffect } from "react";
import { API_BASE_URL, X_APIGW_API_ID } from "../Constants";

function Creating() {
  const [trainingTitle, setTrainingTitle] = useState("");
  const [trainingDescription, setTrainingDescription] = useState("");
  const [trainingVideo, setTrainingVideo] = useState(null);
  const [isSubmitButtonDisabled, setIsSubmitButtonDisabled] = useState(true);
  const [isTrainingCreating, setIsTrainingCreating] = useState(false);

  useEffect(() => {
    document.title = "研修作成";
  }, []);

  /*
   * return {
   *   "bucket": "<s3 bucket>",
   *   "key": "<s3 key>",
   *   "url": "<presigned url>",
   * }
   */
  async function getUploadUrlInfo() {
    try {
      const url = API_BASE_URL + "/video/presigned-url";
      const req = {
        method: "GET",
        headers: {
          "x-apigw-api-id": X_APIGW_API_ID,
        },
      };
      console.log(req);

      const res = await fetch(url, req);
      const resJson = await res.json();
      console.log(resJson);
      /*
       * resJson = {
       *   "presignedUrlInfo": {
       *     "bucket": "<s3 bucket>",
       *     "key": "<s3 key>",
       *     "url": "<presigned url>"
       *   }
       * }
       */
      if ("presignedUrlInfo" in resJson) {
        console.log("getUploadUrlInfo() successful");
        return resJson.presignedUrlInfo;
      } else {
        console.error("getUploadUrlInfo() failed");
        throw new Error("getUploadUrlInfo() failed");
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async function uploadTrainingVideo(uploadUrl) {
    try {
      //const trainingVideoData = new FormData();
      //trainingVideoData.append("file", trainingVideo);
      const url = uploadUrl;
      const req = {
        method: "PUT",
        headers: {
          "x-apigw-api-id": X_APIGW_API_ID,
        },
        //body: trainingVideoData,
        body: trainingVideo,
      };
      console.log(req);

      const res = await fetch(url, req);
      if (res.ok) {
        console.log("uploadTrainingVideo() successful");
      } else {
        throw new Error("uploadTrainingVideo() failed");
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async function requestCreateTraining(uploadUrlInfo) {
    try {
      const trainingVideoS3Bucket = uploadUrlInfo.bucket;
      const trainingVideoS3Key = uploadUrlInfo.key;

      const url = API_BASE_URL + "/training";
      const body = {
        trainingTitle: trainingTitle,
        trainingDescription: trainingDescription,
        trainingVideoS3Bucket: trainingVideoS3Bucket,
        trainingVideoS3Key: trainingVideoS3Key,
      };
      const req = {
        method: "POST",
        headers: {
          "x-apigw-api-id": X_APIGW_API_ID,
          "Content-Type": "pplication/json",
        },
        body: JSON.stringify(body),
      };
      console.log(req);

      const res = await fetch(url, req);
      if (res.ok) {
        console.log("requestCreateTraining() successful");
      } else {
        throw new Error("requestCreateTraining() failed");
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async function createTrainingRequest() {
    console.log(trainingTitle);
    console.log(trainingDescription);
    console.log(trainingVideo);
    setIsTrainingCreating(true);
    setIsSubmitButtonDisabled(true);

    try {
      // get preSignedUrl
      const uploadUrlInfo = await getUploadUrlInfo();
      // upload video
      await uploadTrainingVideo(uploadUrlInfo.url);
      // post createTraining
      await requestCreateTraining(uploadUrlInfo);
      setIsTrainingCreating(false);
      setIsSubmitButtonDisabled(false);
      alert("研修の作成受付が完了しました。\n結果はメールでお知らせします。");
    } catch (e) {
      console.error(e);
      setIsTrainingCreating(false);
      setIsSubmitButtonDisabled(false);
      alert("研修の作成に失敗しました。");
    }
  }

  function changeTrainingVideo(event) {
    const file = event.target.files[0];
    if (file.type !== "video/mp4") {
      setTrainingVideo(null);
      setIsSubmitButtonDisabled(true);
      alert("動画ファイルはmp4である必要があります。");
      return;
    }
    if (file.size >= 1024 * 1024 * 1024 * 5) {
      setTrainingVideo(null);
      setIsSubmitButtonDisabled(true);
      alert("動画ファイルはサイズが5GB未満である必要があります。");
      return;
    }
    setTrainingVideo(file);
  }

  useEffect(() => {
    if (
      trainingTitle.length > 0 &&
      trainingDescription.length > 0 &&
      trainingVideo !== null
    ) {
      setIsSubmitButtonDisabled(false);
    }
  }, [trainingTitle, trainingDescription, trainingVideo]);

  return (
    <div className="container-lg mb-5 mt-5">
      <div className="row mx-3">
        <h2>研修作成</h2>
      </div>

      <div className="row mx-3 mt-5">
        <label className="form-label fs-5">
          研修タイトル<span className="text-danger">*</span>
        </label>
        <div className="col">
          <input
            type="text"
            className="form-control"
            onChange={(event) => {
              setTrainingTitle(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="row mx-3 mt-3">
        <label className="form-label fs-5">
          説明<span className="text-danger">*</span>
        </label>
        <div className="col">
          <textarea
            className="form-control"
            rows="10"
            onChange={(event) => {
              setTrainingDescription(event.target.value);
            }}
          />
        </div>
      </div>

      <div className="row mx-3 mt-3">
        <label className="form-label fs-5">
          動画ファイル<span className="text-danger">* </span>
        </label>
        <div className="col">
          <input
            className="form-control form-control-sm"
            type="file"
            accept="video/mp4"
            onChange={changeTrainingVideo}
          />
          <div className="form-text">
            5GB未満のmp4ファイルである必要があります。
          </div>
        </div>
      </div>

      <div className="row mx-3 mt-5">
        <div className="col">
          <button
            className="btn btn-dark"
            type="button"
            onClick={createTrainingRequest}
            disabled={isSubmitButtonDisabled}
          >
            {isTrainingCreating ? (
              <span>
                <span
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                作成中
              </span>
            ) : (
              <span>作成</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Creating;
