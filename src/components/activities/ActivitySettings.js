"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FiX, FiPlus, FiTrash2, FiInfo } from "react-icons/fi";

export default function ActivitySettings({ isOpen, onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState([]);
  const [competitionSettings, setCompetitionSettings] = useState({
    showNamaz: true,
    showExercise: true,
    showStudy: true,
  });

  useEffect(() => {
    if (user && isOpen) {
      fetchUserActivities();
      fetchCompetitionSettings();
    }
  }, [user, isOpen]);

  const fetchUserActivities = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists() && userDoc.data().activities) {
        setActivities(userDoc.data().activities);
      } else {
        // Default activities if none are set
        setActivities([
          {
            id: "namaz",
            name: "Namaz",
            enabled: true,
            type: "checkboxes",
            options: [
              { id: "fajr", name: "Fajr", score: 1, enabled: true },
              { id: "zuhr", name: "Zuhr", score: 1, enabled: true },
              { id: "asr", name: "Asr", score: 1, enabled: true },
              { id: "maghrib", name: "Maghrib", score: 1, enabled: true },
              { id: "isha", name: "Isha", score: 1, enabled: true },
            ],
          },
          {
            id: "exercise",
            name: "Exercise",
            enabled: true,
            type: "boolean",
            score: 2,
          },
          {
            id: "study",
            name: "Study",
            enabled: true,
            type: "range",
            min: 0,
            max: 5,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setError("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitionSettings = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().competitionSettings) {
        setCompetitionSettings(userDoc.data().competitionSettings);
      }
    } catch (error) {
      console.error("Error fetching competition settings:", error);
    }
  };

  const saveActivities = async () => {
    try {
      setLoading(true);
      await setDoc(
        doc(db, "users", user.uid),
        {
          activities,
          competitionSettings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      onClose();
    } catch (error) {
      console.error("Error saving activities:", error);
      setError("Failed to save activities");
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = (id) => {
    setActivities(activities.map((activity) => (activity.id === id ? { ...activity, enabled: !activity.enabled } : activity)));
  };

  const updateActivity = (id, data) => {
    setActivities(activities.map((activity) => (activity.id === id ? { ...activity, ...data } : activity)));
  };

  const updateOption = (activityId, optionId, data) => {
    setActivities(
      activities.map((activity) => {
        if (activity.id !== activityId || !activity.options) return activity;

        return {
          ...activity,
          options: activity.options.map((option) => (option.id === optionId ? { ...option, ...data } : option)),
        };
      })
    );
  };

  const addCustomActivity = () => {
    const newId = `custom_${Date.now()}`;
    setActivities([
      ...activities,
      {
        id: newId,
        name: "New Goal",
        enabled: true,
        type: "boolean",
        score: 1,
        isCustom: true,
      },
    ]);
  };

  const removeActivity = (id) => {
    setActivities(activities.filter((activity) => activity.id !== id));
  };

  if (!isOpen) return null;

  const isDefaultActivity = (id) => ["namaz", "exercise", "study"].includes(id);

  return (
    <div
      className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center p-4"
    
    >
      {loading ? (
        "..."
      ) : (
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Activity Settings</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <FiX size={24} />
              </button>
            </div>

            {error && <div className="mb-6 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

            <div className="space-y-6">
              {activities.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <input type="checkbox" id={`enable-${activity.id}`} checked={activity.enabled} onChange={() => toggleActivity(activity.id)} className="h-5 w-5 text-emerald-600 rounded" />

                      <div className="ml-3">
                        {activity.isCustom ? (
                          <input
                            type="text"
                            value={activity.name}
                            onChange={(e) => updateActivity(activity.id, { name: e.target.value })}
                            className="font-medium text-lg border-b border-gray-300 focus:border-emerald-500 focus:outline-none"
                          />
                        ) : (
                          <span className="font-medium text-lg">{activity.name}</span>
                        )}

                        {activity.isCustom && (
                          <div className="text-xs text-amber-600 mt-1 flex items-center">
                            <FiInfo className="mr-1" size={12} />
                            Custom goals are not included in competition
                          </div>
                        )}
                      </div>
                    </div>

                    {activity.isCustom && (
                      <button onClick={() => removeActivity(activity.id)} className="text-red-500 hover:text-red-700">
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="pl-8 space-y-4" style={{ display: isDefaultActivity(activity.id) ? "none" : "" }}>
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">Type:</label>
                      <select
                        value={activity.type}
                        onChange={(e) => updateActivity(activity.id, { type: e.target.value })}
                        disabled={!activity.isCustom}
                        className={`border rounded px-2 py-1 text-sm ${!activity.isCustom ? "bg-gray-100" : ""}`}
                      >
                        <option value="boolean">Yes/No</option>
                        <option value="range">Range</option>
                        <option value="checkboxes">Checkboxes</option>
                      </select>
                    </div>

                    {activity.type === "boolean" && (
                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium">Points:</label>
                        <input
                          type="number"
                          min="0"
                          value={activity.score || 0}
                          onChange={(e) => updateActivity(activity.id, { score: parseInt(e.target.value) || 0 })}
                          className="border rounded w-16 px-2 py-1 text-sm"
                        />
                      </div>
                    )}

                    {activity.type === "range" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium">Min:</label>
                          <input
                            type="number"
                            value={activity.min || 0}
                            onChange={(e) => updateActivity(activity.id, { min: parseInt(e.target.value) || 0 })}
                            className="border rounded w-16 px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm font-medium">Max:</label>
                          <input
                            type="number"
                            value={activity.max || 5}
                            onChange={(e) => updateActivity(activity.id, { max: parseInt(e.target.value) || 5 })}
                            className="border rounded w-16 px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {activity.type === "checkboxes" && (
                      <div className="space-y-2">
                        {activity.options &&
                          activity.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-3">
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) => updateOption(activity.id, option.id, { name: e.target.value })}
                                className="border rounded px-2 py-1 text-sm flex-grow"
                                disabled={!activity.isCustom}
                              />
                              <div className="flex items-center">
                                <span className="text-sm mr-1">Points:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={option.score || 0}
                                  onChange={(e) => updateOption(activity.id, option.id, { score: parseInt(e.target.value) || 0 })}
                                  className="border rounded w-12 px-2 py-1 text-sm"
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={addCustomActivity}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 flex items-center justify-center"
              >
                <FiPlus className="mr-2" />
                Add Custom Goal
              </button>
            </div>

            <div className="mt-8 flex justify-end">
              <button onClick={saveActivities} disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50">
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
