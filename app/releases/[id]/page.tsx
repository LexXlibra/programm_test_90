import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/server/http/session";
import { prisma } from "@/server/db/client";
import ReleaseDetail from "./release-detail";

export default async function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const session=await getSession();if(!session)redirect("/login");const {id}=await params;
  const release=await prisma.release.findUnique({
    where:{id},
    include:{
      owner:{select:{name:true,email:true}},
      artists:{include:{artist:true}},
      tracks:{include:{artists:{include:{artist:true}},contributors:true,audioFile:true},orderBy:{trackNumber:"asc"}},
      contributors:true,
      artwork:true,
      comments:{include:{author:{select:{name:true,role:true}}},orderBy:{createdAt:"asc"}},
      statusHistory:{include:{actor:{select:{name:true,role:true}}},orderBy:{createdAt:"asc"}},
    },
  });
  if(!release||release.deletedAt)notFound();if(session.user.role==="USER"&&release.ownerId!==session.user.id)notFound();
  const data={id:release.id,ownerId:release.ownerId,title:release.title,type:release.type,status:release.status,genre:release.genre,language:release.language,explicit:release.explicit,desiredDate:release.desiredDate?.toISOString()??null,createdAt:release.createdAt.toISOString(),updatedAt:release.updatedAt.toISOString(),owner:release.owner,artists:release.artists.map(x=>({name:x.artist.name,role:x.role})),tracks:release.tracks.map(t=>({id:t.id,title:t.title,trackNumber:t.trackNumber,isrc:t.isrc,explicit:t.explicit,audioFile:t.audioFile?{originalName:t.audioFile.originalName,sizeBytes:Number(t.audioFile.sizeBytes),mimeType:t.audioFile.mimeType}:null})),contributors:release.contributors.map(c=>({name:c.name,role:c.role})),artwork:release.artwork?{originalName:release.artwork.originalName}:null,comments:release.comments.map(c=>({id:c.id,body:c.body,createdAt:c.createdAt.toISOString(),author:c.author})),statusHistory:release.statusHistory.map(h=>({id:h.id,fromStatus:h.fromStatus,toStatus:h.toStatus,note:h.note,createdAt:h.createdAt.toISOString(),actor:h.actor})),user:{id:session.user.id,name:session.user.name,role:session.user.role}};
  return <main className="subpage"><header className="subpage-head"><Link className="wizard-back" href="/releases"><ArrowLeft size={14}/> All releases</Link></header><ReleaseDetail release={data}/></main>;
}
