
import React, { useState, useEffect } from 'react';
import { AnalysisData, QuizData } from '../types';
import { generateQuiz } from '../services/geminiService';
import { BrainIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon } from './Icons';

interface Props {
  data: AnalysisData;
  quizPromise?: Promise<QuizData> | null;
}

export const QuizInterface: React.FC<Props> = ({ data, quizPromise }) => {
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load quiz if promise is provided
  useEffect(() => {
    if (quizPromise && !quizData && !isLoading && !error) {
        setIsLoading(true);
        quizPromise
            .then(data => {
                if (data && data.questions && data.questions.length > 0) {
                    setQuizData(data);
                } else {
                    setError("Could not generate questions.");
                }
            })
            .catch(err => {
                console.error(err);
                setError("Failed to generate quiz.");
            })
            .finally(() => setIsLoading(false));
    }
  }, [quizPromise]);

  const startQuiz = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const quiz = await generateQuiz(data);
      if (quiz && quiz.questions && quiz.questions.length > 0) {
          setQuizData(quiz);
          setCurrentQuestion(0);
          setScore(0);
          setIsFinished(false);
          setSelectedOption(null);
          setShowResult(false);
      } else {
          setError("Could not generate questions from this content.");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to generate quiz. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (index: number) => {
    if (showResult) return; // Prevent changing answer
    setSelectedOption(index);
    setShowResult(true);
    if (quizData && index === quizData.questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = () => {
    if (!quizData) return;
    if (currentQuestion < quizData.questions.length - 1) {
      // Small fade effect could be added here
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setIsFinished(true);
    }
  };

  const restartQuiz = () => {
    setIsFinished(false);
    // If we have a promise, we rely on the already loaded data, just reset state
    // But to truly "restart" with NEW questions, we would need to re-call generateQuiz.
    // For now, let's just reset the current quiz.
    setCurrentQuestion(0);
    setScore(0);
    setSelectedOption(null);
    setShowResult(false);
  };

  // --------------------------------------------------------------------------
  // RENDER: Loading State
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gray-700 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-yt-red border-t-transparent rounded-full animate-spin absolute top-0"></div>
          <BrainIcon className="w-8 h-8 text-gray-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-white">Generating Quiz...</h3>
            <p className="text-gray-400">Drafting interactive questions based on content themes.</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Error State
  // --------------------------------------------------------------------------
  if (error) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
              <XCircleIcon className="w-16 h-16 text-red-500 mb-4" />
              <p className="text-xl text-white mb-4">{error}</p>
              <button onClick={startQuiz} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white">Try Again</button>
          </div>
      )
  }

  // --------------------------------------------------------------------------
  // RENDER: Start Screen (Only if no promise was auto-resolved)
  // --------------------------------------------------------------------------
  if (!quizData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] px-6 text-center animate-fade-in bg-gradient-to-b from-transparent to-black/20 rounded-xl">
        <div className="bg-gray-800/50 p-6 rounded-full shadow-2xl mb-8 ring-1 ring-gray-700">
             <BrainIcon className="w-16 h-16 text-yt-red" />
        </div>
        <h3 className="text-3xl font-extrabold text-white mb-4 tracking-tight">Test Your Knowledge</h3>
        <p className="text-gray-400 mb-10 max-w-lg text-lg leading-relaxed">
          Take an AI-generated quiz to verify your understanding of <span className="text-white font-semibold">"{data.title}"</span>.
        </p>
        <button 
          onClick={startQuiz}
          className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-yt-red font-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-600 hover:bg-red-600 hover:scale-105 active:scale-95 shadow-lg shadow-red-900/40"
        >
          <span>Start Interactive Quiz</span>
          <ChevronDownIcon className="w-5 h-5 ml-2 -rotate-90 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Finished State
  // --------------------------------------------------------------------------
  if (isFinished) {
    const percentage = Math.round((score / quizData.questions.length) * 100);
    let feedback = "";
    let colorClass = "";
    
    if (percentage === 100) { feedback = "Perfect Score! You're an expert."; colorClass = "text-green-400"; }
    else if (percentage >= 80) { feedback = "Great job! You know your stuff."; colorClass = "text-green-400"; }
    else if (percentage >= 60) { feedback = "Good effort. Review the notes to improve."; colorClass = "text-yellow-400"; }
    else { feedback = "Keep studying and try again!"; colorClass = "text-red-400"; }

    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] px-6 animate-fade-in text-center">
        <div className="relative mb-8">
            <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="88" stroke="#1f2937" strokeWidth="12" fill="transparent" />
                <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" 
                    className={`${percentage >= 60 ? 'text-green-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                    strokeDasharray={552}
                    strokeDashoffset={552 - (552 * percentage) / 100}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-white tracking-tighter">{percentage}%</span>
                <span className="text-sm text-gray-400 uppercase tracking-widest mt-1 font-bold">Accuracy</span>
            </div>
        </div>

        <h3 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h3>
        <p className={`text-xl mb-10 font-medium ${colorClass}`}>"{feedback}"</p>
        
        <div className="flex gap-4">
            <button 
                onClick={restartQuiz}
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl border border-gray-600 transition-colors font-bold shadow-lg"
            >
                Start New Quiz
            </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER: Active Question State
  // --------------------------------------------------------------------------
  const question = quizData.questions[currentQuestion];

  return (
    <div className="max-w-4xl mx-auto py-2 animate-fade-in min-h-[500px] flex flex-col" key={currentQuestion}>
      {/* Header / Progress Bar */}
      <div className="mb-8 px-2">
         <div className="flex items-center justify-between mb-2">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question {currentQuestion + 1} of {quizData.questions.length}</span>
             <span className="text-xs font-bold text-gray-400">Score: <span className="text-white">{score}</span></span>
         </div>
         <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
             <div 
                className="h-full bg-yt-red transition-all duration-500 ease-out" 
                style={{ width: `${((currentQuestion + 1) / quizData.questions.length) * 100}%` }}
             ></div>
         </div>
      </div>
      
      {/* Question Card */}
      <div className="mb-8">
         <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed tracking-tight">
            {question.question}
         </h3>
      </div>

      {/* Options Grid */}
      <div className="grid gap-4 mb-8">
        {question.options.map((option, idx) => {
          let optionClass = "border-gray-700 bg-gray-800/40 hover:bg-gray-800 hover:border-gray-500 text-gray-300 hover:text-white hover:shadow-lg hover:shadow-gray-900/20";
          let icon = null;
          let showStatus = false;

          // Feedback Logic
          if (showResult) {
            if (idx === question.correctAnswer) {
                optionClass = "border-green-500 bg-green-500/10 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.1)] ring-1 ring-green-500/50";
                icon = <CheckCircleIcon className="w-6 h-6 text-green-400" />;
                showStatus = true;
            } else if (idx === selectedOption) {
                optionClass = "border-red-500 bg-red-500/10 text-red-100 ring-1 ring-red-500/50";
                icon = <XCircleIcon className="w-6 h-6 text-red-400" />;
                showStatus = true;
            } else {
                optionClass = "border-gray-800 opacity-40 bg-gray-900 cursor-not-allowed";
            }
          } else if (selectedOption === idx) {
             optionClass = "border-yt-red bg-yt-red/10 text-white";
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={showResult}
              className={`
                relative w-full text-left p-5 rounded-xl border-2 transition-all duration-200 
                flex items-center justify-between group cursor-pointer outline-none
                ${optionClass}
              `}
            >
              <div className="flex items-center gap-5">
                  <div className={`
                     w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors
                     ${showResult && idx === question.correctAnswer ? 'border-green-500 bg-green-500 text-black' : 
                       showResult && idx === selectedOption ? 'border-red-500 bg-red-500 text-black' :
                       'border-gray-600 text-gray-500 group-hover:border-gray-400 group-hover:text-gray-200'}
                  `}>
                      {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="font-medium text-lg leading-snug">{option}</span>
              </div>
              {showStatus && <div className="animate-scale-in">{icon}</div>}
            </button>
          );
        })}
      </div>

      {/* Result Footer - Revealed after selection */}
      {showResult && (
        <div className="mt-auto animate-fade-in-up">
          <div className={`
              p-6 rounded-xl border mb-6 shadow-2xl relative overflow-hidden
              ${selectedOption === question.correctAnswer ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}
          `}>
            <div className="flex items-start gap-3 relative z-10">
                <div className={`p-2 rounded-full flex-shrink-0 ${selectedOption === question.correctAnswer ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    {selectedOption === question.correctAnswer ? <CheckCircleIcon className="w-6 h-6 text-green-400" /> : <XCircleIcon className="w-6 h-6 text-red-400" />}
                </div>
                <div>
                    <h4 className={`text-lg font-bold mb-1 ${selectedOption === question.correctAnswer ? 'text-green-400' : 'text-red-400'}`}>
                        {selectedOption === question.correctAnswer ? 'Correct Answer!' : 'Incorrect'}
                    </h4>
                    <p className="text-gray-300 text-base leading-relaxed">
                       {question.explanation}
                    </p>
                </div>
            </div>
          </div>
          
          <button
            onClick={nextQuestion}
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2 text-lg active:scale-[0.99]"
          >
            {currentQuestion === quizData.questions.length - 1 ? "See Final Results" : "Next Question →"}
          </button>
        </div>
      )}
    </div>
  );
};
