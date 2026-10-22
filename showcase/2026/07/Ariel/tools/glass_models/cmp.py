import numpy as np, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, pickle
from glb import load; from simp import simplify; from render import draw
SRC={1:'crystal_pendant',2:'faceted_crystal',3:'gradient_crystal_pendant',4:'oval_gemstone'}
res={}
fig=plt.figure(figsize=(16,16))
for i,(k,name) in enumerate(SRC.items()):
    j,acc=load(f'../../assets/models/crystal_{k}.glb'); p=j['meshes'][0]['primitives'][0]
    X=acc(p['attributes']['POSITION']).astype(float); G=acc(p['indices']).reshape(-1,3)
    draw(fig.add_subplot(4,4,i*4+1,projection='3d'),X,G,f'current crystal_{k} {len(G)}')
    for c_i,c in enumerate([18,26,34]):
        Y,H,oe,ymax=simplify(f'source/{name}_3d_model.glb',c); res[(k,c)]=(Y,H,ymax)
        draw(fig.add_subplot(4,4,i*4+2+c_i,projection='3d'),Y,H,f'new cells={c} tris={len(H)} open={oe}')
plt.tight_layout(); plt.savefig('cmp.png',dpi=70); pickle.dump(res,open('res.pkl','wb'))
