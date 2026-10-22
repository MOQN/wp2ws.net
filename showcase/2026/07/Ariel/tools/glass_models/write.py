import json,struct,numpy as np,pickle
res=pickle.load(open('res.pkl','rb'))
CH={1:26,2:18,3:26,4:18}
for k,c in CH.items():
    X,G,ymax=res[(k,c)]; X=X.copy(); X[:,1]-=ymax  # same placement as crystal_k.glb: top at y=0, hanging down
    P=X.astype(np.float32); I=G.astype(np.uint32).ravel()
    pb=P.tobytes(); ib=I.tobytes(); bin_=pb+ib; bin_+=b'\0'*((4-len(bin_)%4)%4)
    j={"asset":{"version":"2.0","generator":"Project B tools"},"scene":0,"scenes":[{"nodes":[0]}],
       "nodes":[{"name":"crystal","mesh":0}],"meshes":[{"name":"crystal","primitives":[{"attributes":{"POSITION":0},"indices":1}]}],
       "accessors":[{"bufferView":0,"componentType":5126,"count":len(P),"type":"VEC3","min":P.min(0).tolist(),"max":P.max(0).tolist()},
                    {"bufferView":1,"componentType":5125,"count":len(I),"type":"SCALAR"}],
       "bufferViews":[{"buffer":0,"byteOffset":0,"byteLength":len(pb),"target":34962},{"buffer":0,"byteOffset":len(pb),"byteLength":len(ib),"target":34963}],
       "buffers":[{"byteLength":len(bin_)}]}
    js=json.dumps(j).encode(); js+=b' '*((4-len(js)%4)%4)
    out=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(bin_))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bin_),0x004E4942)+bin_
    open(f'../../assets/models/crystal_{k}_glass.glb','wb').write(out); print(k,len(G),P.min(0).round(3),P.max(0).round(3),len(out))
