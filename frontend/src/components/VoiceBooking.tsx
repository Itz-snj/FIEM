import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Play, Volume2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface VoiceBookingState {
  isRecording: boolean;
  isProcessing: boolean;
  isPlaying: boolean;
  transcription: string;
  confidence: number;
  detectedIntent: string;
  bookingCreated: boolean;
  error: string | null;
}

interface VoiceBookingResponse {
  success: boolean;
  transcription: string;
  confidence: number;
  intent: string;
  entities: Record<string, any>;
  bookingId?: string;
  error?: string;
}

export const VoiceBooking: React.FC = () => {
  const [state, setState] = useState<VoiceBookingState>({
    isRecording: false,
    isProcessing: false,
    isPlaying: false,
    transcription: '',
    confidence: 0,
    detectedIntent: '',
    bookingCreated: false,
    error: null
  });

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  // Voice prompts for user guidance
  const voicePrompts = [
    "Say: 'I need an ambulance at [location]'",
    "Example: 'Emergency at Main Street, patient having chest pain'",
    "Include: Location, patient condition, severity level",
    "Speak clearly and mention any special requirements"
  ];

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null, 
        transcription: '',
        bookingCreated: false
      }));

      toast({
        title: "Recording Started",
        description: "Speak clearly about your emergency needs",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to access microphone. Please check permissions.' 
      }));
      
      toast({
        variant: "destructive",
        title: "Recording Error",
        description: "Could not access microphone. Check permissions.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      // Mock transcription for demo purposes
      const mockTranscriptions = [
        "I need an ambulance at Main Street near the hospital, patient having chest pain, very urgent",
        "Emergency at MG Road, elderly person fell down, conscious but can't move leg",
        "Ambulance needed at Park Avenue, breathing problems, please send advanced life support",
        "Need medical transport from home to hospital, patient with diabetes emergency"
      ];
      
      const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
      
      setState(prev => ({ 
        ...prev, 
        isRecording: false,
        transcription: randomTranscription,
        confidence: 0.95
      }));
      
      toast({
        title: "Recording Stopped",
        description: "Voice transcribed successfully!",
      });
    }
  };

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      setState(prev => ({ ...prev, isPlaying: true }));
      audioRef.current.play();
    }
  };

  const processVoiceBooking = async () => {
    if (!state.transcription) {
      setState(prev => ({ ...prev, error: 'No transcription available' }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      const response = await fetch('/api/voice-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          transcription: state.transcription,
          userId: localStorage.getItem('userId') || 'anonymous'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: VoiceBookingResponse = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          confidence: result.confidence || 0,
          detectedIntent: result.intent || '',
          bookingCreated: !!result.bookingId,
          isProcessing: false
        }));

        toast({
          title: "Booking Created Successfully!",
          description: `Booking ID: ${result.bookingId}`,
        });

        // Auto-clear after success
        setTimeout(() => {
          resetState();
        }, 5000);

      } else {
        throw new Error(result.error || 'Failed to process voice booking');
      }

    } catch (error) {
      console.error('Voice booking error:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Failed to process voice booking'
      }));

      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "Could not process your voice booking. Please try again.",
      });
    }
  };

  const resetState = () => {
    setState({
      isRecording: false,
      isProcessing: false,
      isPlaying: false,
      transcription: '',
      confidence: 0,
      detectedIntent: '',
      bookingCreated: false,
      error: null
    });
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl('');
    }
  };

  const getIntentBadgeColor = (intent: string) => {
    if (intent.includes('emergency')) return 'destructive';
    if (intent.includes('urgent')) return 'secondary';
    return 'default';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Volume2 className="w-8 h-8 text-red-600" />
            Voice Emergency Booking
          </CardTitle>
          <CardDescription className="text-lg">
            Book an ambulance using voice commands in Hindi or English
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Voice Prompts */}
          <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-red-100">
            <h3 className="font-semibold text-gray-800 mb-3">Voice Booking Guide:</h3>
            <ul className="space-y-2">
              {voicePrompts.map((prompt, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                  {prompt}
                </li>
              ))}
            </ul>
          </div>

          {/* Recording Controls */}
          <div className="flex justify-center space-x-4">
            {!state.isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full"
                disabled={state.isProcessing}
              >
                <Mic className="w-6 h-6 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                size="lg"
                variant="destructive"
                className="px-8 py-4 rounded-full animate-pulse"
              >
                <Square className="w-6 h-6 mr-2" />
                Stop Recording
              </Button>
            )}

            {audioUrl && !state.isRecording && (
              <Button
                onClick={playRecording}
                variant="outline"
                size="lg"
                disabled={state.isPlaying}
                className="px-6 py-4 rounded-full"
              >
                <Play className="w-5 h-5 mr-2" />
                Play Back
              </Button>
            )}
          </div>

          {/* Recording Status */}
          {state.isRecording && (
            <div className="flex items-center justify-center space-x-2 text-red-600">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              <span className="font-semibold">Recording... Speak now</span>
            </div>
          )}

          {/* Audio Element */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setState(prev => ({ ...prev, isPlaying: false }))}
              className="hidden"
            />
          )}

          {/* Process Button */}
          {state.transcription && !state.isRecording && !state.bookingCreated && (
            <div className="text-center">
              <Button
                onClick={processVoiceBooking}
                disabled={state.isProcessing}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
              >
                {state.isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Voice...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Create Booking
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Results Display */}
          {state.transcription && (
            <div className="space-y-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-800 mb-2">Voice Transcription:</h3>
                <p className="text-gray-700 italic">"{state.transcription}"</p>
                
                {state.confidence > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className={`font-semibold ${getConfidenceColor(state.confidence)}`}>
                      {(state.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              {state.detectedIntent && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Detected Intent:</span>
                  <Badge variant={getIntentBadgeColor(state.detectedIntent)}>
                    {state.detectedIntent.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {state.bookingCreated && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Emergency booking created successfully! An ambulance has been dispatched to your location.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Reset Button */}
          {(state.bookingCreated || state.error) && (
            <div className="text-center">
              <Button
                onClick={resetState}
                variant="outline"
                className="px-6 py-2"
              >
                Start New Booking
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Note */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">For immediate life-threatening emergencies:</p>
              <p>Call emergency services directly or use the SOS button. Voice booking is best for non-critical but urgent medical transport needs.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceBooking;