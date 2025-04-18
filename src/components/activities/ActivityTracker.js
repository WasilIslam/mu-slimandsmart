'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FiSettings, FiUser, FiUsers, FiLock, FiAlertTriangle, FiBook } from 'react-icons/fi';
import ActivitySettings from './ActivitySettings';
import CompetitionView from './CompetitionView';
import { 
  format, 
  subDays, 
  isBefore, 
  isAfter,
  parseISO
} from 'date-fns';

export default function ActivityTracker() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState([]);
  const [trackingData, setTrackingData] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'competition'
  const [confirmPenalty, setConfirmPenalty] = useState(false);
  const [penalties, setPenalties] = useState(0);
  const [diary, setDiary] = useState('');
  const [diaryExpanded, setDiaryExpanded] = useState(true);

  useEffect(() => {
    if (user && (viewMode === 'personal' || !loading)) {
      fetchUserActivities();
    }
  }, [user, date, viewMode]);

  const fetchUserActivities = async () => {
    if (viewMode !== 'personal') return;
    
    try {
      setLoading(true);
      
      // Fetch activity settings
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let userActivities = [];
      let userPenalties = 0;
      
      if (userDoc.exists()) {
        if (userDoc.data().activities) {
          userActivities = userDoc.data().activities.filter(a => a.enabled);
          setActivities(userActivities);
        }
        
        // Get penalties if they exist
        if (userDoc.data().penalties) {
          userPenalties = userDoc.data().penalties;
          setPenalties(userPenalties);
        }
      } else {
        // Default activities if none are set
        userActivities = [
          {
            id: 'namaz',
            name: 'Namaz',
            enabled: true,
            type: 'checkboxes',
            options: [
              { id: 'fajr', name: 'Fajr', score: 1, enabled: true },
              { id: 'zuhr', name: 'Zuhr', score: 1, enabled: true },
              { id: 'asr', name: 'Asr', score: 1, enabled: true },
              { id: 'maghrib', name: 'Maghrib', score: 1, enabled: true },
              { id: 'isha', name: 'Isha', score: 1, enabled: true },
            ],
          },
          {
            id: 'exercise',
            name: 'Exercise',
            enabled: true,
            type: 'boolean',
            score: 2,
          },
        ];
        setActivities(userActivities);
      }
      
      // Fetch tracking data for the selected date
      const trackingRef = doc(db, 'users', user.uid, 'tracking', date);
      const trackingDoc = await getDoc(trackingRef);
      
      if (trackingDoc.exists()) {
        setTrackingData(trackingDoc.data());
        // Set diary content if it exists
        setDiary(trackingDoc.data().diary || '');
      } else {
        setTrackingData({});
        setDiary('');
      }
      
      // Calculate total score
      calculateTotalScore(userActivities, trackingDoc.exists() ? trackingDoc.data() : {});
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalScore = (activities, data) => {
    let total = 0;
    
    activities.forEach(activity => {
      if (activity.type === 'boolean') {
        if (data[activity.id]) {
          total += activity.score || 1;
        }
      } else if (activity.type === 'range') {
        total += data[activity.id] || 0;
      } else if (activity.type === 'checkboxes' && activity.options) {
        activity.options.forEach(option => {
          if (data[`${activity.id}_${option.id}`]) {
            total += option.score || 1;
          }
        });
      }
    });
    
    setTotalScore(total);
  };

  const handleTrackingChange = async (activityId, optionId, value) => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const tenDaysAgo = format(subDays(new Date(), 10), 'yyyy-MM-dd');
      
      // Check if date is in the future
      if (isAfter(parseISO(date), new Date())) {
        return; // Don't allow updating future dates
      }
      
      // Check if date is older than 10 days
      if (isBefore(parseISO(date), parseISO(tenDaysAgo))) {
        return; // Don't allow updating dates older than 10 days
      }
      
      // Check if date is older than yesterday (but within 10 days) and needs penalty
      if (isBefore(parseISO(date), parseISO(yesterday)) && !isBefore(parseISO(date), parseISO(tenDaysAgo))) {
        // If we haven't confirmed the penalty yet, show confirmation
        if (!confirmPenalty) {
          setConfirmPenalty(true);
          return;
        }
      }
      
      // Update tracking data
      const newData = { ...trackingData };
      
      if (optionId) {
        newData[`${activityId}_${optionId}`] = value;
      } else {
        newData[activityId] = value;
      }
      
      // Make sure to preserve the diary content
      newData.diary = diary;
      
      setTrackingData(newData);
      
      // Calculate new total score
      calculateTotalScore(activities, newData);
      
      // Save to Firestore
      const trackingRef = doc(db, 'users', user.uid, 'tracking', date);
      
      // Add penalty flag if applicable
      if (isBefore(parseISO(date), parseISO(yesterday)) && !isBefore(parseISO(date), parseISO(tenDaysAgo)) && !trackingData.hasPenalty) {
        newData.hasPenalty = true;
        
        // Apply penalty to user document
        const newPenalties = penalties + 1;
        setPenalties(newPenalties);
        
        // Save penalties to user document
        await setDoc(doc(db, 'users', user.uid), {
          penalties: newPenalties
        }, { merge: true });
      }
      
      await setDoc(trackingRef, newData);
      
      // Reset confirmation state if we just applied a penalty
      if (confirmPenalty) {
        setConfirmPenalty(false);
      }
      
    } catch (error) {
      console.error('Error updating tracking:', error);
      setError('Failed to update tracking');
    }
  };

  const handleDiaryChange = (e) => {
    setDiary(e.target.value);
  };

  const saveDiary = async () => {
    try {
      // Update tracking data with diary
      const newData = { ...trackingData, diary };
      
      // Save to Firestore
      const trackingRef = doc(db, 'users', user.uid, 'tracking', date);
      await setDoc(trackingRef, newData);
      
      // Show a brief success message
      setError('Diary saved successfully!');
      setTimeout(() => setError(''), 2000);
    } catch (error) {
      console.error('Error saving diary:', error);
      setError('Failed to save diary');
    }
  };

  const isDateLocked = () => {
    const today = new Date();
    const selectedDate = parseISO(date);
    const tenDaysAgo = subDays(today, 10);
    
    // Future dates or dates older than 10 days are locked
    return isAfter(selectedDate, today) || isBefore(selectedDate, tenDaysAgo);
  };
  
  const isDatePenalized = () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const selectedDate = parseISO(date);
    
    // Dates older than yesterday but within 10 days incur a penalty
    return isBefore(selectedDate, yesterday) && !isDateLocked();
  };

  if (loading && viewMode === 'personal') {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-white p-8 sm:p-8 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Daily Activity Tracker</h2>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('personal')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-2 ${
                viewMode === 'personal' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiUser size={16} />
              <span className="hidden sm:inline">Personal</span>
            </button>
            <button
              onClick={() => setViewMode('competition')}
              className={`flex items-center gap-1 px-2 sm:px-3 py-2 ${
                viewMode === 'competition' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FiUsers size={16} />
              <span className="hidden sm:inline">Competition</span>
            </button>
          </div>
          
          {viewMode === 'personal' && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full"
              title="Activity Settings"
            >
              <FiSettings size={20} />
            </button>
          )}
        </div>
      </div>

      {viewMode === 'personal' ? (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="date" className="font-medium text-gray-700">
                Select Date:
              </label>
              
              {penalties > 0 && (
                <div className="text-amber-600 text-sm flex items-center gap-1">
                  <FiAlertTriangle className="w-4 h-4" />
                  <span>Penalty points: -{penalties}</span>
                </div>
              )}
            </div>
            
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setConfirmPenalty(false);
              }}
              className="border rounded-md px-3 py-2 w-full"
            />
            
            {isDateLocked() && (
              <div className="mt-2 p-2 sm:p-3 bg-gray-100 rounded-md flex items-center gap-2 text-gray-600">
                <FiLock className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">This date is locked. You can only update dates within the last 10 days.</span>
              </div>
            )}
            
            {isDatePenalized() && !isDateLocked() && (
              <div className="mt-2 p-2 sm:p-3 bg-amber-50 rounded-md flex items-center gap-2 text-amber-700">
                <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base">Late updates incur a -1 point penalty.</span>
              </div>
            )}
            
            {confirmPenalty && (
              <div className="mt-2 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-md">
                <h3 className="font-medium text-amber-800 mb-2">Confirm Late Update</h3>
                <p className="text-amber-700 mb-3 text-sm sm:text-base">
                  Updating this date will incur a -1 point penalty. Do you want to continue?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmPenalty(false)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-md text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // The actual update will happen in handleTrackingChange
                      // This just confirms the user wants to proceed
                      // We'll keep confirmPenalty true so the next call to handleTrackingChange will proceed
                    }}
                    className="px-3 py-1 bg-amber-600 text-white rounded-md"
                  >
                    Accept Penalty
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Diary Section */}
          <div className="mb-6">
            <div 
              className="flex items-center justify-between cursor-pointer p-2 sm:p-3 bg-emerald-50 rounded-t-lg border border-emerald-100"
              onClick={() => setDiaryExpanded(!diaryExpanded)}
            >
              <div className="flex items-center gap-2">
                <FiBook className="text-emerald-600" />
                <h3 className="font-medium text-emerald-800">Daily Diary</h3>
              </div>
              <span>{diaryExpanded ? '−' : '+'}</span>
            </div>
            
            {diaryExpanded && (
              <div className="p-3 sm:p-4 border border-t-0 border-emerald-100 rounded-b-lg">
                <textarea
                  value={diary}
                  onChange={handleDiaryChange}
                  placeholder="Write your thoughts, reflections, or notes for the day..."
                  className="w-full h-32 p-2 sm:p-3 border rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={isDateLocked()}
                ></textarea>
                
                {!isDateLocked() && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={saveDiary}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                    >
                      Save Diary
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 sm:space-y-6 mb-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading activities...</p>
              </div>
            ) : error ? (
              <div className={`p-3 sm:p-4 ${error.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} rounded-md`}>
                {error}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>No activities found. Add some in settings.</p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200"
                >
                  <h3 className="text-lg font-medium text-gray-800 mb-3">{activity.name}</h3>
                  
                  {isDateLocked() ? (
                    <div className="flex items-center justify-center p-3 sm:p-4 bg-gray-50 rounded-md text-gray-500">
                      <FiLock className="w-5 h-5 mr-2" />
                      <span>Locked</span>
                    </div>
                  ) : (
                    <>
                      {activity.type === 'boolean' && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={activity.id}
                            checked={!!trackingData[activity.id]}
                            onChange={(e) => handleTrackingChange(activity.id, null, e.target.checked)}
                            className="h-5 w-5 text-emerald-600 rounded"
                          />
                          <label htmlFor={activity.id} className="ml-2">
                            Completed ({activity.score || 1} pt)
                          </label>
                        </div>
                      )}
                      
                      {activity.type === 'range' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span>{activity.min || 0}</span>
                            <span>{activity.max || 5}</span>
                          </div>
                          <input
                            type="range"
                            min={activity.min || 0}
                            max={activity.max || 5}
                            value={trackingData[activity.id] || 0}
                            onChange={(e) => handleTrackingChange(activity.id, null, parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="text-center font-medium">
                            {trackingData[activity.id] || 0} points
                          </div>
                        </div>
                      )}
                      
                      {activity.type === 'checkboxes' && activity.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          {activity.options.map((option) => (
                            <div key={option.id} className="flex items-center">
                              <input
                                type="checkbox"
                                id={`${activity.id}_${option.id}`}
                                checked={!!trackingData[`${activity.id}_${option.id}`]}
                                onChange={(e) => handleTrackingChange(activity.id, option.id, e.target.checked)}
                                className="h-5 w-5 text-emerald-600 rounded"
                              />
                              <label htmlFor={`${activity.id}_${option.id}`} className="ml-2 text-sm sm:text-base">
                                {option.name} ({option.score} pt)
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 sm:p-4 text-center">
            <h3 className="text-lg font-medium text-emerald-800 mb-1">Total Score</h3>
            <p className="text-3xl font-bold text-emerald-600">
              {totalScore} {penalties > 0 && (
                <span className="text-amber-600 text-lg">(-{penalties} penalty)</span>
              )}
            </p>
            <p className="text-sm text-emerald-700 mt-1">
              Net Score: {totalScore - penalties}
            </p>
          </div>
        </>
      ) : (
        <CompetitionView />
      )}

      <ActivitySettings 
        isOpen={settingsOpen} 
        onClose={() => {
          setSettingsOpen(false);
          fetchUserActivities();
        }} 
      />
    </div>
  );
} 