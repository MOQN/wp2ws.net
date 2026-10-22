import sys,numpy as np
from glb import load
def simplify(f, cells):
    j,acc=load(f); p=j['meshes'][0]['primitives'][0]
    P=acc(p['attributes']['POSITION']).astype(np.float64); F=acc(p['indices']).reshape(-1,3).astype(np.int64)
    # weld by position (ignore UV seams -> no cracks)
    key=np.round(P*1e5).astype(np.int64)
    _,first,inv=np.unique(key,axis=0,return_index=True,return_inverse=True); inv=inv.ravel()
    P=P[first]; F=inv[F]
    F=F[(F[:,0]!=F[:,1])&(F[:,1]!=F[:,2])&(F[:,0]!=F[:,2])]
    v0,v1,v2=P[F[:,0]],P[F[:,1]],P[F[:,2]]
    N=np.cross(v1-v0,v2-v0); A=np.linalg.norm(N,axis=1); ok=A>1e-14; F,N,A,v0=F[ok],N[ok],A[ok],v0[ok]
    n=N/A[:,None]; d=-(n*v0).sum(1); w=A
    lo=P.min(0); h=(P.max(0)-lo).max(); cell=h/cells
    g=np.floor((P-lo)/cell).astype(np.int64)
    _,cid=np.unique(g,axis=0,return_inverse=True); cid=cid.ravel(); K=cid.max()+1
    Aq=np.zeros((K,3,3)); bq=np.zeros((K,3))
    nn=np.einsum('fi,fj->fij',n,n)*w[:,None,None]; nd=n*(d*w)[:,None]
    for c in range(3):
        np.add.at(Aq,cid[F[:,c]],nn); np.add.at(bq,cid[F[:,c]],nd)
    cnt=np.bincount(cid,minlength=K); mean=np.zeros((K,3)); np.add.at(mean,cid,P); mean/=cnt[:,None]
    ev,V=np.linalg.eigh(Aq); thr=ev[:,2:3]*0.02
    inv_ev=np.where(ev>thr,1/np.where(ev>thr,ev,1),0)
    r=-bq-np.einsum('kij,kj->ki',Aq,mean)
    x=mean+np.einsum('kij,kj,kj->ki',V,inv_ev,np.einsum('kji,kj->ki',V,r))
    cmin=np.zeros((K,3)); np.minimum.at(cmin,cid,0); 
    # clamp to the cluster's own vertex bounds (+half a cell)
    bmin=np.full((K,3),np.inf); bmax=np.full((K,3),-np.inf); np.minimum.at(bmin,cid,P); np.maximum.at(bmax,cid,P)
    x=np.clip(x,bmin-cell*0.5,bmax+cell*0.5)
    G=cid[F]; G=G[(G[:,0]!=G[:,1])&(G[:,1]!=G[:,2])&(G[:,0]!=G[:,2])]
    s=np.sort(G,1); _,ui,uc=np.unique(s,axis=0,return_index=True,return_counts=True)
    G=G[ui[uc==1]]  # drop duplicated / back-to-back faces
    used=np.unique(G); remap=-np.ones(K,np.int64); remap[used]=np.arange(len(used))
    X=x[used]; G=remap[G]
    # open edges (holes)
    e=np.sort(np.concatenate([G[:,[0,1]],G[:,[1,2]],G[:,[2,0]]]),1); _,ec=np.unique(e,axis=0,return_counts=True)
    return X,G,(ec==1).sum(),P[:,1].max()
if __name__=='__main__':
    for c in [20,28,36]:
        X,G,openE,_=simplify(sys.argv[1],c); print(c,len(X),len(G),'open edges',openE)
