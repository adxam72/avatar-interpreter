import { useEffect, useRef, useState } from "react";
import { HandPose, REST_POSE, SignSequence, textToSignSequence } from "@/lib/signEngine";

export function useSignPlayer() {
  const [currentPose, setCurrentPose] = useState<HandPose>(REST_POSE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const cancelRef = useRef(false);

  const stop = () => {
    cancelRef.current = true;
    setIsPlaying(false);
    setCurrentPose(REST_POSE);
    setCurrentWord("");
    setProgress(0);
  };

  const play = async (text: string) => {
    cancelRef.current = true;
    await new Promise((r) => setTimeout(r, 0));
    cancelRef.current = false;
    const sequences = textToSignSequence(text);
    if (sequences.length === 0) return;

    setIsPlaying(true);
    const totalPoses = sequences.reduce((sum, s) => sum + s.poses.length, 0);
    let posesDone = 0;

    for (const seq of sequences) {
      if (cancelRef.current) break;
      setCurrentWord(seq.word);
      for (const pose of seq.poses) {
        if (cancelRef.current) break;
        setCurrentPose(pose);
        await new Promise((r) => setTimeout(r, pose.duration / speed));
        posesDone++;
        setProgress(posesDone / totalPoses);
      }
    }

    if (!cancelRef.current) {
      setCurrentPose(REST_POSE);
      setCurrentWord("");
      setProgress(1);
    }
    setIsPlaying(false);
  };

  useEffect(() => () => { cancelRef.current = true; }, []);

  return { currentPose, isPlaying, currentWord, progress, speed, setSpeed, play, stop };
}
