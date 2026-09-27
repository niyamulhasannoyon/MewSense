"""Dataset Pipeline with Group-Based Splitting by Cat and Inter-Annotator Agreement."""

import random
from typing import List, Dict, Any, Tuple
from collections import defaultdict


class DatasetPipeline:
    """Manages training dataset curation, validation, and group-aware train/val/test splits."""

    @staticmethod
    def group_split_by_cat(
        records: List[Dict[str, Any]],
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
        seed: int = 42
    ) -> Dict[str, List[Dict[str, Any]]]:
        """CRITICAL REQUIREMENT:
        Never split recordings randomly if recordings from the same cat can appear
        in both training and test sets.
        This function groups by `group_cat_id` and splits entire cats to avoid acoustic data leakage.
        """
        assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-4, "Ratios must sum to 1.0"

        # Group records by cat subject or human speaker subject
        group_to_records = defaultdict(list)
        unassigned_records = []

        for r in records:
            subject_id = r.get("group_cat_id") or r.get("cat_id") or r.get("group_speaker_id") or r.get("human_speaker_id")
            if subject_id:
                group_to_records[subject_id].append(r)
            else:
                unassigned_records.append(r)

        subject_ids = sorted(list(group_to_records.keys()))
        rng = random.Random(seed)
        rng.shuffle(subject_ids)

        total_subjects = len(subject_ids)
        num_train = int(round(total_subjects * train_ratio))
        num_val = int(round(total_subjects * val_ratio))

        train_subjects = set(subject_ids[:num_train])
        val_subjects = set(subject_ids[num_train : num_train + num_val])
        test_subjects = set(subject_ids[num_train + num_val :])

        splits = {"train": [], "val": [], "test": []}

        for sub_id, sub_recs in group_to_records.items():
            if sub_id in train_subjects:
                splits["train"].extend(sub_recs)
            elif sub_id in val_subjects:
                splits["val"].extend(sub_recs)
            else:
                splits["test"].extend(sub_recs)

        # Distribute unassigned records cleanly without leaking subject identities
        for i, r in enumerate(unassigned_records):
            if i % 3 == 0:
                splits["test"].append(r)
            elif i % 3 == 1:
                splits["val"].append(r)
            else:
                splits["train"].append(r)

        # Sanity check: Ensure disjoint subject sets across train and test
        train_set = {r.get("cat_id") or r.get("human_speaker_id") for r in splits["train"] if r.get("cat_id") or r.get("human_speaker_id")}
        test_set = {r.get("cat_id") or r.get("human_speaker_id") for r in splits["test"] if r.get("cat_id") or r.get("human_speaker_id")}
        overlap = train_set.intersection(test_set)
        assert len(overlap) == 0, f"DATA LEAKAGE DETECTED: Subjects found in both train and test: {overlap}"

        return splits

    @staticmethod
    def calculate_cohen_kappa(ratings_a: List[str], ratings_b: List[str]) -> float:
        """Calculates Cohen's Kappa coefficient for inter-annotator agreement."""
        if len(ratings_a) != len(ratings_b) or len(ratings_a) == 0:
            return 0.0

        n = len(ratings_a)
        categories = sorted(list(set(ratings_a + ratings_b)))
        
        # Observed agreement (Po)
        observed_agree = sum(1 for a, b in zip(ratings_a, ratings_b) if a == b)
        po = observed_agree / n

        # Chance agreement (Pe)
        pe = 0.0
        for cat in categories:
            prob_a = ratings_a.count(cat) / n
            prob_b = ratings_b.count(cat) / n
            pe += prob_a * prob_b

        if pe >= 1.0:
            return 1.0
        kappa = (po - pe) / (1.0 - pe)
        return round(float(kappa), 4)
