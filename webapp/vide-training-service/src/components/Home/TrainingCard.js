import { Link } from "react-router-dom";

export const TrainingCard = (props) => {
  const { training } = props;

  return (
    <div className="col-4 h-100 mb-4">
      <div className="card col border-dark border border-3 h-100">
        <div className="card-body position-relative h-100">
          <h5 className="card-title pb-4">{training.Title}</h5>
          <p className="card-text">{training.Description}</p>
          <Link
            to={"/training?trainingId=" + training.TrainingId}
            className="btn btn-dark mb-2 position-absolute bottom-0"
          >
            START
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TrainingCard;
