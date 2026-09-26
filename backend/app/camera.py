import cv2


def main():
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        raise RuntimeError("Could not open webcam")

    while True:
        success, frame = camera.read()

        if not success:
            print("Failed to read frame")
            break

        cv2.imshow("Pictionary Camera", frame)

        # Press Q to quit
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    camera.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()