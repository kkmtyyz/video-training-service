import { useState, useEffect } from "react";
import { API_BASE_URL } from "../Constants";

function ReviewList({ trainingId, refreshTrigger }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const params = {
        trainingId: trainingId,
      };
      const query = new URLSearchParams(params);
      const url = API_BASE_URL + "/training/reviews?" + query;
      const req = {
        method: "GET",
      };

      const res = await fetch(url, req);
      const resJson = await res.json();
      
      if ("reviews" in resJson) {
        setReviews(resJson.reviews);
      } else {
        setReviews([]);
      }
    } catch (e) {
      console.error(e);
      alert("レビュー取得時にAPIエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [trainingId, refreshTrigger]);

  const renderStars = (rating) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  if (loading) {
    return <div>レビューを読み込み中...</div>;
  }

  if (reviews.length === 0) {
    return <div className="alert alert-info">まだレビューはありません。</div>;
  }

  return (
    <div>
      <h4 className="mb-3">レビュー一覧</h4>
      {reviews.map((review, index) => (
        <div key={index} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="text-warning fs-5">{renderStars(review.Rating)}</div>
              <small className="text-muted">
                {new Date(review.Timestamp).toLocaleString()}
              </small>
            </div>
            <p className="card-text">{review.Comment}</p>
            <footer className="blockquote-footer">
              {review.Email.split("@")[0]}
            </footer>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReviewList;
