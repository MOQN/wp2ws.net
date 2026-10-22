import json,struct,numpy as np
CT={5126:np.float32,5125:np.uint32,5123:np.uint16,5121:np.uint8}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def load(f):
    b=open(f,'rb').read(); n=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+n])
    off=20+n; bl=struct.unpack('<I',b[off:off+4])[0]; bin_=b[off+8:off+8+bl]
    def acc(i):
        a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
        o=bv.get('byteOffset',0)+a.get('byteOffset',0); dt=CT[a['componentType']]; k=NC[a['type']]
        st=bv.get('byteStride',0); cnt=a['count']
        if st and st!=k*np.dtype(dt).itemsize:
            arr=np.ndarray((cnt,k),dt,bin_,o,(st,np.dtype(dt).itemsize))
        else: arr=np.frombuffer(bin_,dt,cnt*k,o).reshape(cnt,k)
        return arr.copy()
    return j,acc
