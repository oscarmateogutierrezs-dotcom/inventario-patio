import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import './Tab3.css';

const Tab3: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Conductor y Placa</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Conductor y Placa</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name="Conductor y Placa page" />
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
