from youtube_transcript_api import YouTubeTranscriptApi
from typing import List, Tuple
from .models import TranscriptSegment
import time


def extract_transcript(video_id: str, max_retries: int = 3) -> Tuple[List[TranscriptSegment], str]:
    """Extract transcript from YouTube video - v1.2.3+ compatible."""
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            print(f"Attempt {attempt + 1}/{max_retries} to fetch transcript for {video_id}")
            
            # v1.2.3+ API: Create instance
            api = YouTubeTranscriptApi()
            
            # Try to get English transcript
            try:
                # v1.2.3 uses instance.fetch() method
                transcript_data = api.fetch(video_id, languages=['en', 'en-US', 'en-GB'])
                language = 'en'
                print(f"Got English transcript with {len(transcript_data)} segments")
            except Exception as e:
                print(f"No English transcript: {str(e)[:100]}")
                # Try to list and get any transcript
                try:
                    transcript_list = api.list(video_id)
                    
                    # Get first available
                    transcript = None
                    for t in transcript_list:
                        transcript = t
                        break
                    
                    if transcript is None:
                        raise ValueError("No transcripts available")
                    
                    transcript_data = transcript.fetch()
                    language = transcript.language_code
                    print(f"Got transcript in {language} with {len(transcript_data)} segments")
                except Exception as list_error:
                    raise ValueError(f"No transcripts found: {str(list_error)}")
            
            # Convert to our format - v1.2.3 returns FetchedTranscriptSnippet objects
            segments = []
            for seg in transcript_data:
                # Handle both object and dict formats
                if hasattr(seg, 'text'):
                    text = seg.text.replace('\n', ' ').strip()
                    start = seg.start  
                    duration = seg.duration
                elif isinstance(seg, dict):
                    text = seg.get('text', '').replace('\n', ' ').strip()
                    start = seg.get('start', 0)
                    duration = seg.get('duration', 0)
                else:
                    continue
                
                if text:
                    segments.append(TranscriptSegment(
                        text=text,
                        start=float(start),
                        duration=float(duration)
                    ))
            
            if not segments:
                raise ValueError("Transcript is empty")
            
            print(f"Successfully extracted {len(segments)} segments")
            return segments, language
            
        except Exception as e:
            last_error = str(e)
            print(f"Attempt {attempt + 1} failed: {last_error}")
            
            if 'transcripts are disabled' in last_error.lower():
                raise ValueError("Transcripts are disabled for this video.")
            if 'video unavailable' in last_error.lower():
                raise ValueError("Video is unavailable.")
            
            if attempt < max_retries - 1:
                wait_time = (attempt + 1) * 2
                print(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
    
    raise ValueError(f"Failed after {max_retries} attempts: {last_error}")
