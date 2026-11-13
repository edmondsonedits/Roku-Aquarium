import {smooth,sampleSwim, type FishPose, type SwimPersonality} from './fish-motion';

/** Seekable 3-axis presentation path. Larger depth means closer to the viewer.
 * No artwork or saved fish data is changed. Scale and heading share the same
 * depth path so approaching fish grow, rather than randomly zooming in place. */
export function samplePanoramaFish(personality: SwimPersonality, seconds: number, reduced = false): FishPose {
 const time = reduced ? 0 : Math.max(0, Number.isFinite(seconds) ? seconds : 0);
 const base = sampleSwim(personality,time*.19,reduced);
 if(reduced)return {...base,scale:personality.scale*1.1};
 const phase = time*.065+personality.curiosity;
 const depth = .53+.27*Math.sin(phase);
 const dz=.27*.065*Math.cos(phase);
 // Central derivative remains well defined at t=0 and horizontal turnarounds.
 const before=sampleSwim(personality,Math.max(0,time-.05)*.19);
 const after=sampleSwim(personality,(time+.05)*.19);
 const dx=(after.x-before.x)/(time<.05?.05+time:.1);
 // A fixed horizontal turn envelope stays continuous even when depth stops too.
 const yaw=smooth(Math.abs(dx)/.0028);
 return {...base,depth,scale:personality.scale*(.62+depth*.8),
  facing:dx>=0?1:-1,yaw,turn:dz>=0?1:-1,
  tailPhase:personality.tailPhase+time*personality.beat*Math.PI*2*.8,
  amplitude:.025+base.amplitude*.22,opacity:1};
}

/** Apply after separation so the school viewport clamp cannot undo the rise. */
export function riseAcrossCoral(pose:FishPose,reduced=false):FishPose {
 if(reduced)return pose;
 const crossing=smooth(1-Math.abs(pose.depth-.58)/.20);
 return {...pose,y:pose.y*(1-crossing)+.135*crossing};
}
