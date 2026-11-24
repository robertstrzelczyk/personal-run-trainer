import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { encodeWorkoutFit, workoutFileName } from "../fit/encode-workout";
import type { Workout } from "../types";
import { workoutToText } from "./describe";

export async function shareWorkoutText(workout: Workout, dayLabel: string) {
  const message = `${dayLabel}\n\n${workoutToText(workout)}`;
  await Share.share({ message, title: workout.title });
}

export async function shareWorkoutFit(workout: Workout, date: Date) {
  if (workout.type === "rest") {
    throw new Error("Odpoczynku nie eksportuje się do FIT.");
  }
  const bytes = encodeWorkoutFit(workout);
  const name = workoutFileName(workout, date);
  const dir = new Directory(Paths.cache, "workouts");
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  const file = new File(dir, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(bytes);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Udostępnianie plików nie jest dostępne na tym urządzeniu.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/octet-stream",
    dialogTitle: "Eksport treningu FIT",
    UTI: "com.garmin.fit",
  });
}
