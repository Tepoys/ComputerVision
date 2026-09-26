import os
os.environ["MEDIAPIPE_DISABLE_GPU"] = "1"
import cv2
import mediapipe as mp


class HandTracker:
    def __init__(self, model_path: str):
        self.base_options = mp.tasks.BaseOptions
        self.hand_landmarker = mp.tasks.vision.HandLandmarker
        self.hand_landmarker_options = mp.tasks.vision.HandLandmarkerOptions
        self.running_mode = mp.tasks.vision.RunningMode

        options = self.hand_landmarker_options(
            base_options=self.base_options(
                model_asset_path=model_path
            ),
            running_mode=self.running_mode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        self.landmarker = self.hand_landmarker.create_from_options(options)

    def process(self, frame, timestamp_ms):
        # OpenCV uses BGR; MediaPipe expects SRGB.
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb_frame,
        )

        return self.landmarker.detect_for_video(
            mp_image,
            timestamp_ms,
        )

    def close(self):
        self.landmarker.close()


def main():
    model_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "models",
        "hand_landmarker.task",
    )

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Could not find hand model at: {model_path}"
        )

    tracker = HandTracker(model_path)

    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        raise RuntimeError("Could not open webcam")

    timestamp_ms = 0

    try:
        while True:
            success, frame = camera.read()

            if not success:
                print("Failed to read frame")
                break

            result = tracker.process(frame, timestamp_ms)
            timestamp_ms += 33  # ~30 FPS

            if result.hand_landmarks:
                # First detected hand
                landmarks = result.hand_landmarks[0]

                # MediaPipe landmark #8 = index fingertip
                index_tip = landmarks[8]

                h, w, _ = frame.shape

                x = int(index_tip.x * w)
                y = int(index_tip.y * h)

                # Draw index fingertip
                cv2.circle(
                    frame,
                    (x, y),
                    10,
                    (0, 255, 0),
                    -1,
                )

                cv2.putText(
                    frame,
                    f"Index: ({index_tip.x:.3f}, {index_tip.y:.3f})",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                )

                # Draw all landmarks
                for landmark in landmarks:
                    px = int(landmark.x * w)
                    py = int(landmark.y * h)

                    cv2.circle(
                        frame,
                        (px, py),
                        4,
                        (255, 0, 0),
                        -1,
                    )

            else:
                cv2.putText(
                    frame,
                    "No hand detected",
                    (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 0, 255),
                    2,
                )

            cv2.imshow("Pictionary Hand Tracker", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    finally:
        camera.release()
        cv2.destroyAllWindows()
        tracker.close()


if __name__ == "__main__":
    main()