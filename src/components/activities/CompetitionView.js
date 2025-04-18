'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FiAward, FiChevronLeft, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isToday, 
  isWeekend,
  isBefore,
  addMonths,
  subMonths,
  isAfter
} from 'date-fns';

export default function CompetitionView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [trackingData, setTrackingData] = useState({});
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [availableActivities, setAvailableActivities] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [competitionSettings, setCompetitionSettings] = useState({
    showNamaz: true,
    showExercise: true,
    showStudy: true
  });
  
  // Generate dates for the current month using date-fns
  const dates = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    return eachDayOfInterval({ start: monthStart, end: monthEnd })
      .map(date => format(date, 'yyyy-MM-dd'));
  }, [currentMonth]);

  // Get current date for highlighting
  const today = format(new Date(), 'yyyy-MM-dd');
  
  useEffect(() => {
    if (user) {
      fetchCompetitionData();
    }
  }, [user, currentMonth]);

  const fetchCompetitionData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log("Fetching competition data...");
      
      // First, get the current user's competition settings
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (currentUserDoc.exists() && currentUserDoc.data().competitionSettings) {
        setCompetitionSettings(currentUserDoc.data().competitionSettings);
      }
      
      // Get available activities based on competition settings
      let userActivities = [];
      
      if (currentUserDoc.exists() && currentUserDoc.data().activities) {
        const allActivities = currentUserDoc.data().activities;
        
        // Filter activities based on competition settings
        if (competitionSettings.showNamaz) {
          const namaz = allActivities.find(a => a.id === 'namaz');
          if (namaz) userActivities.push(namaz);
        }
        
        if (competitionSettings.showExercise) {
          const exercise = allActivities.find(a => a.id === 'exercise');
          if (exercise) userActivities.push(exercise);
        }
        
        if (competitionSettings.showStudy) {
          const study = allActivities.find(a => a.id === 'study');
          if (study) userActivities.push(study);
        }
      }
      
      // If no activities found, use defaults
      if (userActivities.length === 0) {
        userActivities = [
          {
            id: 'namaz',
            name: 'Namaz',
            enabled: true,
            type: 'checkboxes',
            options: [
              { id: 'fajr', name: 'Fajr', score: 1 },
              { id: 'zuhr', name: 'Zuhr', score: 1 },
              { id: 'asr', name: 'Asr', score: 1 },
              { id: 'maghrib', name: 'Maghrib', score: 1 },
              { id: 'isha', name: 'Isha', score: 1 },
            ]
          }
        ];
        
        if (competitionSettings.showExercise) {
          userActivities.push({
            id: 'exercise',
            name: 'Exercise',
            enabled: true,
            type: 'boolean',
            score: 2
          });
        }
        
        if (competitionSettings.showStudy) {
          userActivities.push({
            id: 'study',
            name: 'Study',
            enabled: true,
            type: 'range',
            min: 0,
            max: 5
          });
        }
      }
      
      setAvailableActivities(userActivities);
      
      // Fetch all users
      console.log("Fetching all users...");
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = [];
      
      console.log(`Found ${usersSnapshot.docs.length} user documents`);
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        console.log(`Processing user: ${userDoc.id}, email: ${userData.email || 'no email'}`);
        
        // Include all users with an ID, even if they don't have an email
        usersData.push({
          id: userDoc.id,
          email: userData.email || 'No Email',
          name: userData.displayName || userData.email || userDoc.id,
          photoURL: userData.photoURL,
          penalties: userData.penalties || 0
        });
      }
      
      console.log(`Processed ${usersData.length} users`);
      
      // Sort users alphabetically
      usersData.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(usersData);
      
      // Get the start and end dates for the month
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      // Fetch all tracking data for the month in a more efficient way
      const trackingDataByUser = {};
      usersData.forEach(userData => {
        trackingDataByUser[userData.id] = {};
      });
      
      // Create a batch of promises to fetch tracking data for each user
      const fetchPromises = usersData.map(async (userData) => {
        try {
          // Get all tracking documents for this user for the current month
          const trackingQuery = query(
            collection(db, 'users', userData.id, 'tracking'),
            where('__name__', '>=', startDate),
            where('__name__', '<=', endDate)
          );
          
          const trackingSnapshot = await getDocs(trackingQuery);
          
          trackingSnapshot.forEach(doc => {
            trackingDataByUser[userData.id][doc.id] = doc.data();
          });
        } catch (e) {
          console.error(`Error fetching data for user ${userData.id}:`, e);
        }
      });
      
      // Wait for all fetches to complete
      await Promise.all(fetchPromises);
      
      setTrackingData(trackingDataByUser);
      console.log("Competition data fetched successfully");
      
    } catch (error) {
      console.error('Error fetching competition data:', error);
      setError('Failed to load competition data');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (userId, date) => {
    if (!trackingData[userId] || !trackingData[userId][date]) {
      return 0;
    }
    
    const userData = trackingData[userId][date];
    let score = 0;
    
    if (selectedActivity === 'all') {
      // Calculate score for all activities
      availableActivities.forEach(activity => {
        if (activity.type === 'boolean') {
          if (userData[activity.id]) {
            score += activity.score || 1;
          }
        } else if (activity.type === 'range') {
          score += userData[activity.id] || 0;
        } else if (activity.type === 'checkboxes' && activity.options) {
          activity.options.forEach(option => {
            if (userData[`${activity.id}_${option.id}`]) {
              score += option.score || 1;
            }
          });
        }
      });
      
      // Apply penalty if this was a late update
      if (userData.hasPenalty) {
        score -= 1;
      }
    } else {
      // Calculate score for selected activity
      const activity = availableActivities.find(a => a.id === selectedActivity);
      
      if (activity) {
        if (activity.type === 'boolean') {
          if (userData[activity.id]) {
            score += activity.score || 1;
          }
        } else if (activity.type === 'range') {
          score += userData[activity.id] || 0;
        } else if (activity.type === 'checkboxes' && activity.options) {
          activity.options.forEach(option => {
            if (userData[`${activity.id}_${option.id}`]) {
              score += option.score || 1;
            }
          });
        }
      }
    }
    
    return Math.max(0, score); // Ensure score doesn't go below 0
  };

  const calculateTotalScore = (userId) => {
    let total = 0;
    let penaltyPoints = 0;
    
    // Get user penalties
    const userDoc = users.find(u => u.id === userId);
    if (userDoc && userDoc.penalties) {
      penaltyPoints = userDoc.penalties;
    }
    
    // Calculate score for each date
    dates.forEach(date => {
      total += calculateScore(userId, date);
    });
    
    // Subtract penalty points
    return Math.max(0, total - penaltyPoints);
  };

  const getUserRanking = () => {
    // Create a copy of users array with total scores
    const usersWithScores = users.map(userData => ({
      ...userData,
      totalScore: calculateTotalScore(userData.id)
    }));
    
    // Sort by total score (descending)
    return usersWithScores.sort((a, b) => b.totalScore - a.totalScore);
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    // Only allow going to future months if they're not after the current month
    if (!isAfter(addMonths(currentMonth, 1), new Date())) {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const formatMonthYear = (date) => {
    return format(date, 'MMMM yyyy');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-red-500">
        <FiAlertCircle size={24} className="mb-2" />
        <p>{error}</p>
        <button 
          onClick={fetchCompetitionData}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <p className="text-gray-600">No users found for competition.</p>
      </div>
    );
  }

  const rankedUsers = getUserRanking();
  console.log("Ranked users:", rankedUsers);

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Competition Leaderboard</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={previousMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
            >
              <FiChevronLeft />
            </button>
            <span className="font-medium">{formatMonthYear(currentMonth)}</span>
            <button 
              onClick={nextMonth}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
              disabled={isAfter(addMonths(currentMonth, 1), new Date())}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        {availableActivities.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Activity
            </label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Activities</option>
              {availableActivities.map(activity => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="overflow-x-auto border rounded-lg">
          <div className="min-w-max">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-10 bg-gray-50 p-3 border-b border-r text-left font-medium text-gray-700 min-w-[180px]">
                    User
                  </th>
                  {dates.map(dateStr => {
                    const date = new Date(dateStr);
                    const day = format(date, 'd');
                    const isCurrentDay = dateStr === today;
                    const isWeekendDay = isWeekend(date);
                    
                    return (
                      <th 
                        key={dateStr} 
                        className={`p-2 border-b text-center font-medium text-xs ${
                          isCurrentDay ? 'bg-emerald-50 text-emerald-700' : 
                          isWeekendDay ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div>{day}</div>
                      </th>
                    );
                  })}
                  <th className="sticky right-0 z-10 p-3 border-b border-l bg-gray-100 text-center font-medium text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedUsers.map((userData, index) => (
                  <tr 
                    key={userData.id} 
                    className={`${userData.id === user.uid ? 'bg-emerald-50' : 
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="sticky left-0 z-10 p-3 border-r font-medium flex items-center gap-2 min-w-[180px] bg-inherit">
                      <span className="flex-shrink-0 w-6 text-center">
                        {index === 0 ? (
                          <FiAward className="text-yellow-500" size={18} />
                        ) : index === 1 ? (
                          <FiAward className="text-gray-400" size={18} />
                        ) : index === 2 ? (
                          <FiAward className="text-amber-700" size={18} />
                        ) : (
                          <span className="text-gray-500 text-sm">{index + 1}</span>
                        )}
                      </span>
                      <span className="truncate">{userData.name}</span>
                    </td>
                    
                    {dates.map(dateStr => {
                      const date = new Date(dateStr);
                      const score = calculateScore(userData.id, dateStr);
                      const isCurrentDay = dateStr === today;
                      const isWeekendDay = isWeekend(date);
                      
                      return (
                        <td 
                          key={dateStr} 
                          className={`p-2 text-center border-r border-t ${
                            isCurrentDay ? 'bg-emerald-50' : 
                            isWeekendDay ? 'bg-gray-50' : ''
                          }`}
                        >
                          {score > 0 ? (
                            <div className={`font-medium ${
                              score > 5 ? 'text-emerald-600' : 
                              score > 3 ? 'text-blue-600' : 
                              'text-gray-600'
                            }`}>
                              {score}
                            </div>
                          ) : (
                            <div className="text-gray-300">-</div>
                          )}
                        </td>
                      );
                    })}
                    
                    <td className="sticky right-0 z-10 p-3 border-l border-t text-center font-bold bg-gray-50">
                      {calculateTotalScore(userData.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 