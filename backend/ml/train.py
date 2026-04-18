"""
Offline training script.
Builds a TF-IDF + cosine similarity model on a seed catalogue
and saves model.joblib alongside the catalogue CSV.
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
import os

SEED_BOOKS = [
    {"isbn": "9780061965548", "title": "The Hobbit", "authors": "J.R.R. Tolkien", "genres": "Fantasy Adventure", "description": "A reluctant hobbit embarks on a grand adventure with dwarves and a wizard to reclaim a treasure from a dragon."},
    {"isbn": "9780743273565", "title": "The Great Gatsby", "authors": "F. Scott Fitzgerald", "genres": "Classic Fiction", "description": "A mysterious millionaire pursues a lost love in 1920s America."},
    {"isbn": "9780451524935", "title": "1984", "authors": "George Orwell", "genres": "Dystopian Fiction Science Fiction", "description": "A totalitarian government surveils its citizens in a bleak future society."},
    {"isbn": "9780062315007", "title": "The Alchemist", "authors": "Paulo Coelho", "genres": "Fiction Philosophy Adventure", "description": "A shepherd boy travels across Egypt following his dream and discovering the soul of the world."},
    {"isbn": "9780316769174", "title": "The Catcher in the Rye", "authors": "J.D. Salinger", "genres": "Classic Fiction Coming-of-Age", "description": "A disillusioned teenager navigates New York City after being expelled from school."},
    {"isbn": "9780385737951", "title": "The Maze Runner", "authors": "James Dashner", "genres": "Young Adult Science Fiction Dystopian", "description": "A boy wakes with no memory in a maze filled with other teens and deadly monsters."},
    {"isbn": "9780439023481", "title": "The Hunger Games", "authors": "Suzanne Collins", "genres": "Young Adult Dystopian Science Fiction", "description": "A teenage girl volunteers for a televised fight-to-the-death competition in a post-apocalyptic society."},
    {"isbn": "9780062409850", "title": "Sapiens", "authors": "Yuval Noah Harari", "genres": "Non-fiction History", "description": "A brief history of humankind from ancient ancestors to modern society."},
    {"isbn": "9780307474278", "title": "The Girl with the Dragon Tattoo", "authors": "Stieg Larsson", "genres": "Mystery Thriller Crime", "description": "A journalist and hacker investigate a decades-old disappearance of a wealthy family heiress."},
    {"isbn": "9780385490818", "title": "Dune", "authors": "Frank Herbert", "genres": "Science Fiction Epic Fantasy", "description": "A noble family takes control of a desert planet that produces the most valuable substance in the universe."},
    {"isbn": "9780553212501", "title": "Crime and Punishment", "authors": "Fyodor Dostoevsky", "genres": "Classic Fiction Psychological", "description": "A student commits murder and wrestles with guilt and redemption."},
    {"isbn": "9780061550010", "title": "Blink", "authors": "Malcolm Gladwell", "genres": "Non-fiction Psychology Self-help", "description": "An exploration of rapid cognition and how we make split-second decisions."},
    {"isbn": "9780374533557", "title": "Thinking Fast and Slow", "authors": "Daniel Kahneman", "genres": "Non-fiction Psychology Science", "description": "A dual-process theory of the mind exploring intuition and deliberate reasoning."},
    {"isbn": "9780525559474", "title": "The Midnight Library", "authors": "Matt Haig", "genres": "Fiction Fantasy", "description": "A woman discovers a library between life and death where each book represents a different life she could have lived."},
    {"isbn": "9780062457714", "title": "A Brief History of Time", "authors": "Stephen Hawking", "genres": "Science Non-fiction Physics", "description": "An accessible exploration of cosmology, black holes, and the nature of time."},
]

def train():
    df = pd.DataFrame(SEED_BOOKS)
    df["text"] = df["title"] + " " + df["authors"] + " " + df["genres"] + " " + df["description"]

    vectorizer = TfidfVectorizer(max_features=5000, stop_words="english", ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(df["text"])
    similarity = cosine_similarity(tfidf_matrix)

    model = {
        "vectorizer": vectorizer,
        "tfidf_matrix": tfidf_matrix,
        "similarity": similarity,
        "catalogue": df.to_dict("records"),
    }

    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    joblib.dump(model, "model.joblib")
    print(f"[train] Model saved with {len(df)} books")

if __name__ == "__main__":
    train()
