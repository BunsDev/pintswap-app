import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import { Button } from './button';

type IModalProps = {
  children: React.ReactElement;
  button: string | React.ReactNode;
  title?: string;
}

export function TransitionModal({ children, button, title }: IModalProps) {
  const [open, setOpen] = React.useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <>
      {typeof button === 'string' ? (
        <Button onClick={handleOpen}>{button}</Button>
      ) : (
        <div onClick={handleOpen} className="cursor-pointer">{button}</div>
      )}
      <Modal
        aria-labelledby={title || 'Modal'}
        open={open}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={open}>
          <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              boxShadow: '24',
              padding: 4,
          }}>
            {children}
          </div>
        </Fade>
      </Modal>
    </>
  );
}