"""Evaluation suite for MewSense vocalization and behavioral classification models."""

from typing import List, Dict, Any
from collections import defaultdict
import numpy as np


class ModelEvaluator:
    """Evaluates multi-class audio classifiers and reports comprehensive metrics."""

    @staticmethod
    def evaluate_predictions(
        y_true: List[str],
        y_pred: List[str],
        probabilities: List[Dict[str, float]] = None,
        classes: List[str] = None
    ) -> Dict[str, Any]:
        """Calculates Macro F1, Per-Class Precision/Recall/F1, Confusion Matrix, and Accuracy."""
        assert len(y_true) == len(y_pred), "y_true and y_pred must have identical length"

        if not classes:
            classes = sorted(list(set(y_true + y_pred)))

        total_samples = len(y_true)
        if total_samples == 0:
            return {"error": "Empty evaluation dataset"}

        # 1. Confusion Matrix
        cm = {c1: {c2: 0 for c2 in classes} for c1 in classes}
        for true_label, pred_label in zip(y_true, y_pred):
            if true_label in cm and pred_label in cm[true_label]:
                cm[true_label][pred_label] += 1

        # 2. Per-class Precision, Recall, F1
        per_class_metrics = {}
        f1_list = []
        precision_list = []
        recall_list = []

        correct_count = 0

        for c in classes:
            tp = cm[c][c]
            fp = sum(cm[other][c] for other in classes if other != c)
            fn = sum(cm[c][other] for other in classes if other != c)

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

            per_class_metrics[c] = {
                "support": tp + fn,
                "precision": round(float(precision), 4),
                "recall": round(float(recall), 4),
                "f1_score": round(float(f1), 4)
            }

            f1_list.append(f1)
            precision_list.append(precision)
            recall_list.append(recall)
            correct_count += tp

        macro_precision = float(np.mean(precision_list))
        macro_recall = float(np.mean(recall_list))
        macro_f1 = float(np.mean(f1_list))
        overall_accuracy = float(correct_count / total_samples)

        # 3. Dedicated High-Stakes Subgroup Analysis (Distress / Pain vs Normal)
        distress_classes = {"HISS", "GROWL", "YOWL", "DISCOMFORT_POSSIBLE_PAIN", "FEAR_ANXIETY"}
        distress_tp = sum(cm[c][c] for c in classes if c in distress_classes)
        distress_support = sum(sum(cm[c].values()) for c in classes if c in distress_classes)
        distress_recall = distress_tp / distress_support if distress_support > 0 else 1.0

        # 4. Dedicated Human Meow Imitation Benchmark Metrics (Hard-Negative Evaluation)
        human_meow_samples = [i for i, label in enumerate(y_true) if label in ["HUMAN_MEOW", "NON_CAT_SOUND", "HUMAN_SPEECH"]]
        human_meow_fp = sum(1 for i in human_meow_samples if y_pred[i] not in ["NON_CAT_SOUND", "OTHER_UNKNOWN", "UNCERTAIN"])
        human_meow_fpr = human_meow_fp / len(human_meow_samples) if human_meow_samples else 0.0

        return {
            "total_samples": total_samples,
            "overall_accuracy": round(overall_accuracy, 4),
            "macro_precision": round(macro_precision, 4),
            "macro_recall": round(macro_recall, 4),
            "macro_f1": round(macro_f1, 4),
            "distress_subgroup_sensitivity": round(distress_recall, 4),
            "human_meow_false_positive_rate": round(human_meow_fpr, 4),
            "per_class": per_class_metrics,
            "confusion_matrix": cm
        }

    @staticmethod
    def evaluate_human_meow_benchmark(
        records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Evaluates model performance specifically on the Human Meow Imitation Benchmark dataset.
        Calculates False Positive Rate on Human Meows, Precision, Recall, F1, and Confusion Matrix.
        """
        y_true = []
        y_pred = []

        for r in records:
            true_cat = r.get("is_cat_vocalization", False)
            predicted_status = r.get("prediction_status", "NO_VALID_PREDICTION")
            detection_status = r.get("detection_status", "NON_CAT_SOUND")

            y_true.append("CAT_VOCALIZATION" if true_cat else "NON_CAT_SOUND")
            y_pred.append("CAT_VOCALIZATION" if detection_status == "CAT_VOCALIZATION" else "NON_CAT_SOUND")

        return ModelEvaluator.evaluate_predictions(y_true, y_pred)


if __name__ == "__main__":
    # Self-test synthetic evaluation
    y_true = ["MEOW", "MEOW", "PURR", "HISS", "YOWL", "HUMAN_MEOW", "HUMAN_MEOW", "OTHER_UNKNOWN"]
    y_pred = ["MEOW", "MEOW", "PURR", "HISS", "YOWL", "NON_CAT_SOUND", "NON_CAT_SOUND", "OTHER_UNKNOWN"]
    res = ModelEvaluator.evaluate_predictions(y_true, y_pred)
    print("Evaluation self-test result:")
    print(f"Macro F1: {res['macro_f1']}, Accuracy: {res['overall_accuracy']}")
    print(f"Human Meow FPR: {res['human_meow_false_positive_rate']}")

