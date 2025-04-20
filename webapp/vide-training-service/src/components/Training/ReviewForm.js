import { useState } from "react";
import { API_BASE_URL } from "../Constants";

function ReviewForm({ trainingId, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = API_BASE_URL + "/training/review";
      const body = {
        trainingId: trainingId,
        rating: rating,
        comment: comment,
      };
      const req = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      };

      const res = await fetch(url, req);
      if (res.ok) {
        setComment("");
        setRating(5);
        if (onReviewSubmitted) {
          onReviewSubmitted();
        }
      } else {
        console.error("Review submission failed");
        alert("レビューの投稿に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("APIエラー");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h5 className="mb-0">レビューを投稿</h5>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="rating" className="form-label">
              評価
            </label>
            <select
              className="form-select"
              id="rating"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              required
            >
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="comment" className="form-label">
              コメント
            </label>
            <textarea
              className="form-control"
              id="comment"
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            ></textarea>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? "送信中..." : "レビューを投稿"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReviewForm;
